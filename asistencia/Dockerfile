# asistencia/Dockerfile
FROM node:18-alpine

# Install required tools
RUN apk add --no-cache python3 make g++ curl

# WORK AS ROOT FIRST
WORKDIR /app
COPY package*.json ./
RUN npm install --package-lock-only
RUN npm ci

# Explicit dependency verification
RUN npm list express-session && npm list connect-redis

# Use existing node user from base image
RUN chown -R node:node /app

# Copy application code with correct ownership
COPY --chown=node:node . .

# Set environment variables
ENV NODE_ENV=production \
    AWS_SDK_LOAD_CONFIG=1 \
    # Add platform specification for M1 Macs
    DOCKER_DEFAULT_PLATFORM=linux/amd64

# Create logs directory and set permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Switch to non-root user - DO THIS LAST
USER node

EXPOSE 3003

# Add healthcheck with better timeout values
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use node with ES modules enabled
CMD ["node", "--experimental-specifier-resolution=node", "server.js"]

