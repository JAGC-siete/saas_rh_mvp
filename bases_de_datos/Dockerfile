FROM node:18-alpine3.19

# Install dependencies required for node-gyp and curl for healthcheck
RUN apk add --no-cache python3 make g++ curl

# Create app directory and ensure correct permissions
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Generate package-lock.json if it doesn't exist and install dependencies as root
RUN npm install --package-lock-only && \
    npm ci && \
    # Clean up
    npm cache clean --force

# Verify critical dependency versions
RUN echo "=== Checking express-session version ===" && \
    npm list express-session && \
    echo "=== Checking connect-redis version ===" && \
    npm list connect-redis && \
    echo "=== Checking redis version ===" && \
    npm list redis

# Create non-root user if it doesn't exist
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Copy application code with correct ownership
# Exclude node_modules and other unnecessary files
COPY --chown=node:node . .

# Set environment variables
ENV NODE_ENV=production
ENV AWS_SDK_LOAD_CONFIG=1

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && chmod 755 /app/logs

# Healthcheck to verify service is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
