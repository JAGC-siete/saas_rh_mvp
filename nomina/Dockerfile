FROM node:18-alpine3.19

# Install dependencies required for node-gyp
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

# Switch to node user
USER node

# Set environment variables
ENV NODE_ENV=production \
    AWS_SDK_LOAD_CONFIG=1 \
    DOCKER_DEFAULT_PLATFORM=linux/amd64 \
    AWS_REGION=us-east-1

EXPOSE 3002

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "server.js"]
