#! /bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Testing Redis connectivity...${NC}"

# Build bases_de_datos image if needed
docker-compose build bases_de_datos

# Run the Redis test server
docker-compose run --rm bases_de_datos npm run test:redis

# Check the result
result=$?

if [ $result -eq 0 ]; then
    echo -e "${GREEN}Redis connection test passed!${NC}"
else
    echo -e "${RED}Redis connection test failed!${NC}"
    exit 1
fi
