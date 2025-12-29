from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Literal, Dict
import os
from pathlib import Path
import requests
from dotenv import load_dotenv
import json
from datetime import datetime, date
from collections import defaultdict

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="多云聊天 API")

# Get the parent directory (project root)
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议配置具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# IP限流存储：{date: {ip: count}}
ip_usage: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

def get_client_ip(request: Request) -> str:
    """获取客户端真实IP地址"""
    # 优先从代理头获取（如果使用了反向代理）
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # 直接连接的IP
    return request.client.host if request.client else "unknown"

def check_ip_limit(ip: str, has_custom_key: bool) -> bool:
    """检查IP是否超过每日限制"""
    # 如果使用自定义key，不限制
    if has_custom_key:
        return True
    
    today = date.today().isoformat()
    daily_limit = int(os.getenv("DAILY_FREE_LIMIT", "10"))
    
    # 获取今天的使用记录
    if today not in ip_usage:
        # 清理旧数据
        ip_usage.clear()
        ip_usage[today] = defaultdict(int)
    
    current_usage = ip_usage[today][ip]
    return current_usage < daily_limit

def increment_ip_usage(ip: str, has_custom_key: bool):
    """增加IP使用计数"""
    # 如果使用自定义key，不计数
    if has_custom_key:
        return
    
    today = date.today().isoformat()
    if today not in ip_usage:
        ip_usage[today] = defaultdict(int)
    
    ip_usage[today][ip] += 1

def get_ip_usage(ip: str) -> dict:
    """获取IP使用情况"""
    today = date.today().isoformat()
    daily_limit = int(os.getenv("DAILY_FREE_LIMIT", "10"))
    
    if today not in ip_usage:
        return {"used": 0, "limit": daily_limit, "remaining": daily_limit}
    
    used = ip_usage[today].get(ip, 0)
    return {
        "used": used,
        "limit": daily_limit,
        "remaining": max(0, daily_limit - used)
    }

# 请求模型
class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: str = "qwen-plus"
    provider: Literal["aliyun", "openai"] = "aliyun"
    stream: bool = False
    max_tokens: Optional[int] = None
    temperature: Optional[float] = 0.7
    api_key: Optional[str] = None  # 用户自定义API key

class ImageRequest(BaseModel):
    prompt: str
    provider: Literal["aliyun", "openai"] = "openai"
    size: str = "1024x1024"
    n: int = 1
    api_key: Optional[str] = None  # 用户自定义API key

# 云平台配置
PROVIDER_CONFIGS = {
    "aliyun": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "chat_endpoint": "/chat/completions",
        "image_endpoint": "/images/generations",
        "api_key_env": "DASHSCOPE_API_KEY"
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "chat_endpoint": "/chat/completions",
        "image_endpoint": "/images/generations",
        "api_key_env": "OPENAI_API_KEY"
    },
    "aliyun_image": {
        "base_url": "https://dashscope.aliyuncs.com/api/v1",
        "image_endpoint": "services/aigc/multimodal-generation/generation",
        "api_key_env": "DASHSCOPE_API_KEY"
    }
}

def get_api_key(provider: str, custom_key: Optional[str] = None):
    """获取指定云平台的API密钥，优先使用用户自定义的key"""
    # 如果提供了自定义key，直接使用
    if custom_key:
        return custom_key
    
    config = PROVIDER_CONFIGS.get(provider)
    if not config:
        raise HTTPException(status_code=400, detail=f"Unsupported provider / 不支持的云平台: {provider}")
    
    api_key = os.getenv(config["api_key_env"])
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail=f"{provider.upper()} API Key not configured / {provider.upper()} API Key 未配置"
        )
    return api_key

def make_api_request(provider: str, endpoint: str, data: dict, api_key: str):
    """发送HTTP请求到云平台API；如果 endpoint 是完整 URL 则直接使用，不再盲目拼接"""
    # 如果 endpoint 是完整 URL，直接使用
    if isinstance(endpoint, str) and endpoint.lower().startswith(("http://", "https://")):
        url = endpoint
    else:
        config = PROVIDER_CONFIGS.get(provider)
        if not config:
            raise HTTPException(status_code=400, detail=f"Unsupported provider / 不支持的云平台: {provider}")
        base = config.get("base_url", "").rstrip("/")
        ep = str(endpoint).lstrip("/")
        url = f"{base}/{ep}" if base else ep

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    try:
        resp = requests.post(url, headers=headers, json=data, timeout=60)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Upstream request failed / 上游请求失败: {str(e)}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=f"API request failed / API请求失败: {resp.text}")

    try:
        return resp.json()
    except ValueError:
        return {"raw_text": resp.text}

@app.get("/")
async def root():
    """Serve the main HTML page / 提供主页面"""
    return FileResponse(str(STATIC_DIR / "index.html"))

@app.get("/api/config")
async def get_config():
    """Get application configuration / 获取应用配置"""
    return {
        "appName": os.getenv("APP_NAME", "多云聊天平台"),
        "appNameEn": os.getenv("APP_NAME_EN", "Multi-Cloud Chat"),
        "dailyFreeLimit": int(os.getenv("DAILY_FREE_LIMIT", "10"))
    }

@app.get("/api/usage")
async def get_usage(req: Request):
    """Get current IP usage / 获取当前IP使用情况"""
    client_ip = get_client_ip(req)
    return get_ip_usage(client_ip)

@app.get("/api/models")
async def get_models():
    """Get supported model list / 获取支持的模型列表"""
    return {
        "aliyun": [
            {"id": "qwen-plus", "name": "Qwen Plus", "name_zh": "通义千问 Plus"},
            {"id": "qwen-turbo", "name": "Qwen Turbo", "name_zh": "通义千问 Turbo"},
            {"id": "qwen-max", "name": "Qwen Max", "name_zh": "通义千问 Max"},
            {"id": "qwen-long", "name": "Qwen Long", "name_zh": "通义千问 Long"}
        ],
        "openai": [
            {"id": "gpt-4", "name": "GPT-4"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo"}
        ]
    }

@app.post("/api/chat")
async def chat(request: ChatRequest, req: Request):
    """Chat API / 聊天接口"""
    try:
        # 获取客户端IP
        client_ip = get_client_ip(req)
        has_custom_key = bool(request.api_key)
        
        # 检查IP限制
        if not check_ip_limit(client_ip, has_custom_key):
            usage = get_ip_usage(client_ip)
            raise HTTPException(
                status_code=429,
                detail=f"Daily free quota exceeded ({usage['used']}/{usage['limit']}). Please provide your own API key. / 每日免费配额已用完 ({usage['used']}/{usage['limit']})，请输入自己的 API Key。"
            )
        
        config = PROVIDER_CONFIGS[request.provider]
        
        # 获取API key（优先使用用户提供的）
        api_key = get_api_key(request.provider, request.api_key)
        
        # 转换消息格式
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # 构建请求参数
        data = {
            "model": request.model,
            "messages": messages,
            "temperature": request.temperature,
        }
        
        if request.max_tokens:
            data["max_tokens"] = request.max_tokens
        
        # 调用 API
        result = make_api_request(request.provider, config["chat_endpoint"], data, api_key)
        
        # 增加IP使用计数
        increment_ip_usage(client_ip, has_custom_key)
        
        return {
            "message": {
                "role": "assistant",
                "content": result["choices"][0]["message"]["content"]
            },
            "usage": result.get("usage", {}),
            "model": result.get("model", request.model)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed / 请求失败: {str(e)}")

@app.post("/api/generate-image")
async def generate_image(request: ImageRequest):
    """Image generation API / 生成图片接口"""
    try:
        config = PROVIDER_CONFIGS[request.provider]
        
        # 获取API key（优先使用用户提供的）
        api_key = get_api_key(request.provider, request.api_key)
        
        data = {
            "model": "dall-e-3" if request.provider == "openai" else "wanx-v1",
            "prompt": request.prompt,
            "size": request.size,
            "n": request.n
        }
        
        result = make_api_request(request.provider, config["image_endpoint"], data, api_key)
        
        return {
            "images": [{"url": img["url"]} for img in result["data"]]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed / 生成图片失败: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
