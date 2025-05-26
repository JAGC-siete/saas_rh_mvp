#!/bin/bash

echo "🔧 Verificando y creando carpeta logs con permisos adecuados..."

# Navega a la raíz del proyecto
cd "$(dirname "$0")"

# Crear carpeta logs si no existe
if [ ! -d "./logs" ]; then
    echo "📂 Carpeta ./logs no existe. Creando..."
    mkdir -p logs
else
    echo "📂 Carpeta ./logs ya existe. Continuando..."
fi

# Asignar permisos 777
echo "🔒 Asignando permisos 777 a ./logs"
chmod -R 777 logs

# Verificar si docker-compose.yml contiene el volumen
if ! grep -q "./logs:/app/logs" docker-compose.yml; then
    echo "⚠️  Asegurate de tener el volumen './logs:/app/logs' en tu docker-compose.yml bajo el servicio bases_de_datos."
else
    echo "✅ Volumen ./logs:/app/logs detectado en docker-compose.yml"
fi

# Reconstruir servicio bases_de_datos
echo "♻️  Reiniciando servicio bases_de_datos sin caché..."
docker-compose down
docker-compose build --no-cache bases_de_datos
docker-compose up -d

# Mostrar logs
echo "📜 Logs del servicio bases_de_datos:"
docker-compose logs -f bases_de_datos
