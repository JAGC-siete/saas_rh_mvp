# asistencia/Dockerfile
# Use Node.js 18 with Alpine Linux
FROM node:18-alpine

# Install dependencies required for node-gyp and health checks
RUN apk add --no-cache python3 make g++ curl

# Create app directory and set ownership
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    # Clean npm cache to reduce image size
    npm cache clean --force

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production \
    AWS_SDK_LOAD_CONFIG=1 \
    # Add platform specification for M1 Macs
    DOCKER_DEFAULT_PLATFORM=linux/amd64

# Create non-root user for security
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3003

# Add healthcheck with better timeout values
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use node with ES modules enabled
CMD ["node", "--experimental-specifier-resolution=node", "server.js"]

