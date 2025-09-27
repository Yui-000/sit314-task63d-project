#!/bin/bash

echo "Starting Smart Agriculture IoT Backend Services with Docker..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# 停止并删除现有容器
echo "Stopping existing containers..."
docker-compose -f docker-compose.security.yml down

# 构建并启动后端服务
echo "Building and starting backend services..."
docker-compose -f docker-compose.security.yml up -d --build

# 等待服务启动
echo "Waiting for services to start..."
sleep 15

# 检查服务状态
echo "Checking service status..."
docker-compose -f docker-compose.security.yml ps

# 检查端口
echo "Checking exposed ports..."
docker-compose -f docker-compose.security.yml port auth-service 3001
docker-compose -f docker-compose.security.yml port encryption-service 3002
docker-compose -f docker-compose.security.yml port security-audit 3003
docker-compose -f docker-compose.security.yml port sensor-api 3004
docker-compose -f docker-compose.security.yml port decision-engine 3005
docker-compose -f docker-compose.security.yml port data-processing 3006

echo "Backend services started successfully!"
echo "Backend APIs available on ports 3001-3006"
echo "Start frontend locally: cd frontend && npm start"
echo "Use 'docker-compose -f docker-compose.security.yml ps' to check status"
echo "Use 'docker-compose -f docker-compose.security.yml logs' to view logs"
