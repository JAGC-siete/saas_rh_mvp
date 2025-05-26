FROM node:18-alpine3.19

# Install dependencies required for node-gyp and curl for healthcheck
RUN apk add --no-cache python3 make g++ curl

# Create app directory and ensure correct permissions
WORKDIR /app

# Set proper ownership
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Copy package files with correct ownership
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code with correct ownership
COPY --chown=node:node . .

# Set environment variables
ENV NODE_ENV=production
ENV AWS_SDK_LOAD_CONFIG=1

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs && chmod 755 /app/logs

# Ensure all files are owned by node user
RUN chmod -R 755 /app

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
