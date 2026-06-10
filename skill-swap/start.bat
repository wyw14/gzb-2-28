@echo off
echo ========================================
echo    技能交换社区 - 一键启动脚本
echo ========================================
echo.

echo [1/2] 启动后端服务...
cd backend
if not exist node_modules (
    echo 正在安装后端依赖...
    npm install
)
start "Skill Swap Backend" cmd /k "npm start"
cd ..

timeout /t 3 /nobreak >nul

echo [2/2] 启动前端服务...
cd frontend
if not exist node_modules (
    echo 正在安装前端依赖...
    npm install
)
start "Skill Swap Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo 启动完成！
echo 后端服务: http://localhost:3000
echo 前端服务: http://localhost:5173
echo ========================================
echo.
pause
