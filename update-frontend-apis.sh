#!/bin/bash

# 获取AWS公网IP
AWS_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "your-aws-ip")

echo "Updating frontend API URLs to use AWS IP: $AWS_IP"

# 更新前端代码中的localhost为AWS IP
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/http:\/\/localhost:3001/http:\/\/$AWS_IP:3001/g"
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/http:\/\/localhost:3002/http:\/\/$AWS_IP:3002/g"
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/http:\/\/localhost:3003/http:\/\/$AWS_IP:3003/g"
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/http:\/\/localhost:3004/http:\/\/$AWS_IP:3004/g"
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/http:\/\/localhost:3005/http:\/\/$AWS_IP:3005/g"
find frontend/src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s/http:\/\/localhost:3006/http:\/\/$AWS_IP:3006/g"

echo "Frontend API URLs updated successfully!"
echo "Now start frontend locally: cd frontend && npm start"
echo "Frontend will connect to backend at: $AWS_IP:3001-3006"
