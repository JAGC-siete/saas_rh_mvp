# Hikvision Proxy Service

This service acts as a secure, server-side proxy to communicate with Hikvision biometric devices. It follows a secure architecture that never exposes device credentials to the frontend.

## Architecture
- **Framework**: Node.js with Express
- **Library**: `hikvision-isapi` for device communication
- **Queueing**: BullMQ with Redis for asynchronous tasks (e.g., employee sync)
- **Deployment**: Docker container on a serverless platform (Fly.io, Render, Railway)
- **Secrets Management**: Credentials are injected as environment variables from a secure vault like Supabase Vault.

## Endpoints

### `POST /api/v1/hik/provision`
Provisions a device by setting its webhook URL and event configuration. This is called by the main SaaS application.

### Health Check
- `GET /health`: A simple health check endpoint.

## Environment Variables
Copy `.env.example` to `.env` for local development.
- `REDIS_URL`: Connection string for your Redis instance.
- `PORT`: Port the proxy server will run on.
- `LOG_LEVEL`: Logging verbosity.

Device credentials should be managed in Supabase Vault and injected into the service's environment at runtime.

## Running Locally
1.  `npm install`
2.  `npm run dev`

## Building for Production
1.  `npm run build`
2.  `npm start`

## Docker
A `Dockerfile` is provided for containerized deployment.
- `docker build -t hikvision-proxy .`
- `docker run -p 3001:3001 --env-file .env hikvision-proxy`
