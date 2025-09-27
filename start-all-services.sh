#!/bin/bash

# 启动所有服务的脚本

echo "Starting Smart Agriculture IoT System..."

# 创建日志目录
mkdir -p logs

# 设置环境变量
export NODE_ENV=production
export MONGODB_URI=mongodb+srv://s224387234:123456qwerty@sit314.4orhwty.mongodb.net/?retryWrites=true&w=majority&appName=sit314
export JWT_SECRET=cf7ff06cdebaef9eb1b320b0d9ae8b9cfad9c4143c68c941624accd92f8fa89b8bc1200ca6c7e8eda523eb6d419d49ad342299b09a1702942efec8102f35d6eb
export ENCRYPTION_KEY=6f96b3363db80f03770de4a39959192351174110102727b5d0033a9b1dbdc590
export MASTER_ENCRYPTION_KEY=19b85b2bbfe216e7459e3273dc14c7f17553009a40f0e292008999ca676e3903
export REDIS_PASSWORD=067960a6049c13228d65de93f91fddbb
export ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080

# 安装所有依赖
echo "Installing dependencies..."
cd auth-service && npm install --omit=dev && cd ..
cd encryption-service && npm install --omit=dev && cd ..
cd security-audit && npm install --omit=dev && cd ..
cd decision-engine-service && npm install --omit=dev && cd ..
cd data-processing-service && npm install --omit=dev && cd ..
cd frontend && npm install && cd ..
cd node-red-simulation && npm install --omit=dev && cd ..

# 启动所有服务
echo "Starting services..."

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

# Nginx不需要，因为前端在本地
echo "Nginx not needed - frontend runs locally"

# 保存PM2配置
pm2 save
pm2 startup

echo "All backend services started!"
echo "Backend APIs available on ports 3001-3006"
echo "Frontend should run locally: cd frontend && npm start"
echo "Use 'pm2 status' to check service status"
echo "Use 'pm2 logs' to view logs"
