FROM node:18-alpine3.19

# Install dependencies required for node-gyp and curl for healthcheck
RUN apk add --no-cache python3 make g++ curl

# Create app directory
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

# Verify critical dependency versions
RUN echo "=== Checking express-session version ===" && \
    npm list express-session && \
    echo "=== Checking connect-redis version ===" && \
    npm list connect-redis && \
    echo "=== Checking redis version ===" && \
    npm list redis

# Switch to node user
USER node

# Set environment variables
ENV NODE_ENV=production \
    AWS_SDK_LOAD_CONFIG=1 \
    DOCKER_DEFAULT_PLATFORM=linux/amd64 \
    AWS_REGION=us-east-1

# Healthcheck to verify service is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
