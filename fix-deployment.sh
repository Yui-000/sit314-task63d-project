#!/bin/bash

echo "Fixing deployment issues..."

# 停止所有PM2进程
pm2 stop all
pm2 delete all

# 停止Nginx
sudo systemctl stop nginx

# 检查端口占用
echo "Checking port usage..."
sudo lsof -i :3000 -i :3001 -i :3002 -i :3003 -i :3004 -i :3005 -i :3006 -i :8080 || echo "No processes found on these ports"

# 杀死可能占用端口的进程
sudo pkill -f "node.*server.js" || echo "No node processes to kill"
sudo pkill -f "npm.*start" || echo "No npm processes to kill"

# 等待端口释放
sleep 3

# 重新启动服务
echo "Restarting services..."

# 启动后端服务
pm2 start auth-service/server.js --name "auth-service"
pm2 start encryption-service/server.js --name "encryption-service"
pm2 start security-audit/server.js --name "security-audit"
pm2 start sensor-api-server.js --name "sensor-api"
pm2 start decision-engine-service/server.js --name "decision-engine"
pm2 start data-processing-service/server.js --name "data-processing"

# 启动传感器模拟器
pm2 start node-red-simulation/sensor-simulator.js --name "sensor-simulator"

# 前端在本地运行，不启动
echo "Frontend should run locally with: cd frontend && npm start"

# 等待服务启动
echo "Waiting for services to start..."
sleep 10

# 检查服务状态
echo "Checking service status..."
pm2 status

# 检查端口
echo "Checking ports..."
sudo lsof -i :3000 -i :3001 -i :3002 -i :3003 -i :3004 -i :3005 -i :3006 || echo "Some ports may not be in use"

# Nginx不需要，因为前端在本地
echo "Nginx not needed - frontend runs locally"

echo "Backend deployment completed!"
echo "Check status with: pm2 status"
echo "Check logs with: pm2 logs"
echo "Start frontend locally: cd frontend && npm start"
