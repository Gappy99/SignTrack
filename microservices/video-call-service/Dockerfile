FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY microservices/video-call-service/package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY microservices/video-call-service/src ./src
COPY microservices/video-call-service/server.js ./
COPY microservices/shared ./shared
COPY microservices/env ./env

# Expose port
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
