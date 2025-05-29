# asistencia/Dockerfile

FROM node:18-alpine

# Install required dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy configuration files
COPY package*.json ./
COPY .env ./.env

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3003

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3003/health || exit 1

# Start using ESM
CMD ["node", "--experimental-specifier-resolution=node", "server.js"]

