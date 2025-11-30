# Stage 1: Build the application
FROM node:22-alpine AS builder
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript project
RUN npm run build

# Stage 2: Production environment
FROM node:22-alpine
WORKDIR /usr/src/app

# Copy production dependencies from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Copy compiled code from builder
COPY --from=builder /usr/src/app/dist ./dist

# Expose the port the app runs on
EXPOSE 3001

# Start the app
CMD [ "npm", "start" ]
