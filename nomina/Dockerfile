FROM node:18-alpine3.19

# Install dependencies required for node-gyp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Use existing node user from base image
RUN chown -R node:node /app

# Copy application code with correct ownership
COPY --chown=node:node . .

# Set environment variables
ENV NODE_ENV=production
ENV AWS_SDK_LOAD_CONFIG=1

# Create logs directory and set permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Switch to non-root user - THIS MUST BE AFTER ALL ROOT OPERATIONS
USER node

EXPOSE 3002

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "server.js"]
