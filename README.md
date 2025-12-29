# 多云聊天平台 / Multi-Cloud Chat Platform

一个支持多云平台的现代化聊天应用，类似 DeepSeek Chat 和 OpenAI Chat。

A modern chat application supporting multiple cloud platforms, similar to DeepSeek Chat and OpenAI Chat.

**✨ 纯 Python + 原生 HTML/JS，无需 npm！/ Pure Python + Native HTML/JS, No npm required!**

## 功能特性 / Features

✨ **多云平台支持 / Multi-Cloud Support**
- 阿里云通义千问 (Qwen Plus/Turbo/Max/Long) / Alibaba Cloud Qwen
- OpenAI GPT 系列 (GPT-4/GPT-3.5) / OpenAI GPT Series

💬 **聊天功能 / Chat Features**
- 实时对话 / Real-time conversation
- Markdown 渲染 / Markdown rendering
- 多模型切换 / Multiple model switching
- 聊天历史 / Chat history
- Token 使用统计 / Token usage statistics

🎨 **图片生成 / Image Generation**
- DALL-E 3 (OpenAI)
- 通义万相 (阿里云) / Tongyi Wanxiang (Alibaba Cloud)

🌍 **多语言支持 / Multi-Language**
- 中文界面 / Chinese UI
- English UI
- 动态语言切换 / Dynamic language switching

� **现代化技术栈 / Modern Tech Stack**
- FastAPI 后端 / FastAPI backend  
- 原生 HTML + JavaScript 前端 / Native HTML + JavaScript frontend
- DeepSeek 风格 UI / DeepSeek-style UI
- 深色/浅色主题 / Dark/Light theme
- 无需 Node.js 和 npm / No Node.js or npm required

## 项目结构 / Project Structure

```
chatbot_cloud/
├── backend/              # FastAPI 后端API / FastAPI Backend API
│   ├── main.py          # 主应用文件 / Main application
│   frontend/            # React 前端 / React Frontend
│   ├── src/
│   │   ├── App.tsx      # 主组件 / Main component
│   │   ├── App.css      # 样式 / Styles
│   │   ├── i18n.ts      # 多语言 / Multi-language
│   │   └── main.tsx     # 入口 / Entry point
│   ├── package.json     # 项目配置 / Project config
│   └── vite.config.ts   # Vite 配置 / Vite config
└── app.py               # Streamlit 版本（可选）/ Streamlit version (optional)
└── .env.example         # 环境变量示例 / Environment variables template
```

## 快速开始 / Quick Start

### 1. 安装依赖 / Install Dependencies

```powershell
# 创建虚拟环境（推荐） / Create virtual environment (recommended)
python -m venv venv
.\venv\Scripts\activate

# 安装所有依赖 / Install all dependencies
pip install -r requirements.txt
```

### 2. 配置环境变量 / Configure Environment Variables

```powershell
# 复制环境变量模板 / Copy environment template
copy .env.example .env

# 编辑 .env 文件，填入你的 API Keys
# Edit .env file and add your API Keys
# DASHSCOPE_API_KEY=your_alibaba_cloud_key
# OPENAI_API_KEY=your_openai_key
```

### 3. 启动服务 / Start Services

**启动后端 API / Start Backend API (Terminal 1):**
```powershell
cd backend
python main.py
```
后端将运行在 http://localhost:8000 / Backend will run at http://localhost:8000

**启动前端界面 / Start Frontend UI (Terminal 2):**
```powershell
streamlit run app.py
```
前端将自动打开浏览器，默认运行在 http://localhost:8501
Frontend will automatically open browser at http://localhost:8501

### 4. 开始使用 / Start Using
 / API Keys Configuration

### 阿里云 DashScope / Alibaba Cloud DashScope

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/) / Visit [Alibaba Cloud Bailian Platform](https://bailian.console.aliyun.com/)
2. 创建 API Key / Create API Key
3. 在 `backend/.env` 中设置 `DASHSCOPE_API_KEY` / Set `DASHSCOPE_API_KEY` in `backend/.env`

### OpenAI

1. 访问 [OpenAI Platform](https://platform.openai.com/) / Visit [OpenAI Platform](https://platform.openai.com/)
2. 创建 API Key / Create API Key
3. 在 `backend/.env` 中设置 `OPENAI_API_KEY` / Set `OPENAI_API_KEY` in `backend/.env

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 创建 API Key
3. 在 `backend/.env` 中设置 `OPENAI_API_KEY`

## API 接口 / API Endpoints

### 获取模型列表 / Get Model List
```
GET /api/models
```

### 聊天 / Chat
```
POST /api/chat
{
  "messages": [{"role": "user", "content": "Hello"}],
  "model": "qwen-plus",
  "provider": "aliyun"
}
```

### 生成图片 / Generate Image
```
POST /api/generate-image
{
  "prompt": "A cute cat on the moon",
  "provider": "openai",
  "size": "1024x1024"
}
```

## 技术栈 / Tech Stack

**后端 API / Backend API:**
- 原生 HTML5 + CSS3 + JavaScript / Native HTML5 + CSS3 + JavaScript
- 通过 CDN 引入库（Marked.js, Lucide Icons）/ Libraries via CDN
- DeepSeek 风格设计 / DeepSeek-style design
- 深色/浅色主题切换 / Dark/Light theme toggle
- 无需构建步骤 / No build step required

**优势 / Advantages:**
- ✅ 零依赖安装 / Zero dependencies to install
- ✅ 即开即用 / Ready out of the box
- ✅ 现代化美观的界面 / Modern and beautiful UI
- ✅ 流畅的用户体验 / Smooth user experience
- ✅ 响应式设计 / Responsive design
- ✅ 中英文双语支持 / Chinese and English bilingual support
- ✅ 易于部署和维护 / Easy to deploy and maintain
- ✅ 纯 Python 技术栈 / Pure Python stack
- ✅ 无需前端构建工具 / No frontend build tools needed
- ✅ 快速开发和部署 / Rapid development and deployment
- ✅ 易于维护和扩展 / Easy to maintain and extend
- ✅ 中英文双语支持 / Chinese and English bilingual support

## 生产部署

### 使用 Docker（推荐）

```dockerfile
# Dockerfile 示例
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# 使用 supervisor 或脚本同时启动后端和前端
CMD ["sh", "-c", "cd backend && python main.py & streamlit run app.py --server.port 8501 --server.address 0.0.0.0"]
```

### 手动部署

**后端:**
```powershell
# 使用 Gunicorn + Uvicorn
cd backend
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**前端:**
```powershell
# Streamlit 生产模式
streamlit run app.py --server.port 8501 --server.address 0.0.0.0
```

## 注意事项

⚠️ **安全提示:**
- 不要将 API Keys 提交到版本控制
- 生产环境请配置正确的 CORS 域名
- 建议使用环境变量管理敏感信息

📝 **开发建议:**
- 后端 API 默认端口 8000
- Streamlit 前端默认端口 8501
- 需要同时启动后端和前端两个服务
- 可以使用 `streamlit run app.py` 一键启动前端

💡 **提示:**
- 如果遇到端口占用，可在启动命令中指定其他端口
- Streamlit 支持热重载，修改代码后自动刷新
- 建议在虚拟环境中运行，避免依赖冲突

## License

MIT
