#!/bin/bash

echo "Fixing frontend service..."

# 停止并删除前端进程
pm2 stop frontend 2>/dev/null || echo "Frontend not running"
pm2 delete frontend 2>/dev/null || echo "Frontend not found"

# 进入前端目录并启动
echo "Starting frontend..."
cd frontend
pm2 start npm --name "frontend" -- start
cd ..

# 等待启动
echo "Waiting for frontend to start..."
sleep 15

# 检查状态
echo "Checking PM2 status..."
pm2 status

# 检查端口
echo "Checking port 3000..."
sudo lsof -i :3000 || echo "Port 3000 not listening"

# Nginx已删除，不需要检查

echo "Frontend fix completed!"
echo "Frontend should run locally: cd frontend && npm start"
