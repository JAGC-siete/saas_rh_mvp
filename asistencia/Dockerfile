# asistencia/Dockerfile
FROM node:18-alpine

# Install required tools
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Set up directory structure and permissions first
RUN mkdir -p /app/logs && \
    chown -R node:node /app && \
    chmod -R 755 /app/logs

# Copy package files and install dependencies
COPY --chown=node:node package*.json ./
RUN npm install --package-lock-only && npm ci

# Copy application code EXCEPT logs
COPY --chown=node:node . .

# Verify dependencies
RUN npm list express-session && npm list connect-redis

# Switch to node user
USER node

# Set environment variables
ENV NODE_ENV=production \
    AWS_SDK_LOAD_CONFIG=1 \
    DOCKER_DEFAULT_PLATFORM=linux/amd64 \
    AWS_REGION=us-east-1

EXPOSE 3003

# Add healthcheck with better timeout values
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use node with ES modules enabled
CMD ["node", "--experimental-specifier-resolution=node", "server.js"]

