FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY microservices/frame-processor-service/package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY microservices/frame-processor-service/src ./src
COPY microservices/frame-processor-service/server.js ./
COPY microservices/shared ./shared
COPY microservices/env ./env

# Expose port
EXPOSE 3201

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3201/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
