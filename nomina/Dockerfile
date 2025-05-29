FROM node:18-alpine

# Instalar dependencias necesarias
RUN apk add --no-cache curl

# Crear directorio de la aplicación
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/health | grep -q '"status":"healthy"' || exit 1

# Exponer puerto
EXPOSE 3002

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
