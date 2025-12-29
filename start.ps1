# 启动脚本 - 一键启动后端和前端

Write-Host "🚀 启动多云聊天平台..." -ForegroundColor Cyan
Write-Host ""

# 检查虚拟环境
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "✅ 激活虚拟环境..." -ForegroundColor Green
    & venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠️  未检测到虚拟环境，使用全局 Python" -ForegroundColor Yellow
}

# 检查 .env 文件
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  未找到 .env 文件，正在创建..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "📝 请编辑 .env 文件，填入你的 API Keys" -ForegroundColor Yellow
    Write-Host ""
}

# 启动后端
Write-Host "🔧 启动后端 API (端口 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python main.py"

# 等待后端启动
Write-Host "⏳ 等待后端启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 启动前端
Write-Host "🎨 启动前端界面 (端口 8501)..." -ForegroundColor Green
Write-Host ""
Write-Host "✨ 浏览器将自动打开 Streamlit 界面" -ForegroundColor Cyan
Write-Host ""

streamlit run app.py
