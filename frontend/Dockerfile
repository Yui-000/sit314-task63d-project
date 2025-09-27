# Multi-stage build for React frontend
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install all dependencies
RUN npm install

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
