FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install minimal dependencies
RUN apk add --no-cache curl dumb-init

# Skip user creation for faster build (development only)
# RUN addgroup -g 1001 -S nodejs && \
#     adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Skip user creation for faster build (development only)
# RUN chown -R nodejs:nodejs /app
# USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Start the application with dumb-init
CMD ["dumb-init", "--", "node", "server.js"]
