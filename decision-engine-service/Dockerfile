FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Skip user creation for faster build (development only)
# RUN addgroup -g 1001 -S nodejs
# RUN adduser -S nodejs -u 1001

# Skip user creation for faster build (development only)
# RUN chown -R nodejs:nodejs /app
# USER nodejs

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# Start the application
CMD ["node", "server.js"]
