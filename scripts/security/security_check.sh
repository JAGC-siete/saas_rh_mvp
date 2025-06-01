#!/bin/bash

echo "🔒 Running Security and DevOps Verification Script"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1${NC}"
        echo -e "${YELLOW}⚠️  Recommendation: $2${NC}"
    fi
}

echo -e "\n1️⃣ Docker Security Checks"
echo "------------------------"

# Check if containers are running with resource limits
echo "Checking container resource limits..."
docker-compose ps -q | while read -r container_id; do
    if ! docker inspect "$container_id" | grep -q "Memory\": [0-9]"; then
        echo -e "${RED}✗ Container $container_id has no memory limits${NC}"
    fi
done

# Check network configuration
echo -e "\nChecking network isolation..."
if ! grep -q "networks:" docker-compose.yml; then
    echo -e "${RED}✗ No custom networks defined${NC}"
fi

# Check exposed ports
echo -e "\nChecking exposed ports..."
if grep -q "ports:" docker-compose.yml; then
    if ! grep -q "127.0.0.1:" docker-compose.yml; then
        echo -e "${RED}✗ Ports exposed to all interfaces${NC}"
    fi
fi

echo -e "\n2️⃣ Environment Security Checks"
echo "-----------------------------"

# Check for .env files
echo "Checking environment files..."
if [ ! -f .env.template ]; then
    echo -e "${RED}✗ No .env.template file found${NC}"
fi

# Check for sensitive data in docker-compose
echo -e "\nChecking for hardcoded credentials..."
if grep -q "POSTGRES_PASSWORD.*:" docker-compose.yml; then
    echo -e "${RED}✗ Hardcoded database credentials found${NC}"
fi

echo -e "\n3️⃣ Network Security Checks"
echo "-------------------------"

# Check for security middleware in Node.js services
for service in bases_de_datos asistencia nomina; do
    echo "Checking $service middleware..."
    if [ -f "$service/server.js" ]; then
        if ! grep -q "helmet" "$service/server.js"; then
            echo -e "${RED}✗ Missing Helmet middleware in $service${NC}"
        fi
        if ! grep -q "cors" "$service/server.js"; then
            echo -e "${RED}✗ Missing CORS configuration in $service${NC}"
        fi
        if ! grep -q "rateLimit" "$service/server.js"; then
            echo -e "${RED}✗ Missing rate limiting in $service${NC}"
        fi
    fi
done

echo -e "\n4️⃣ Application Security Checks"
echo "-----------------------------"

# Check for SQL injection prevention
echo "Checking SQL injection prevention..."
for service in bases_de_datos asistencia nomina; do
    if [ -f "$service/server.js" ]; then
        if grep -q "query(" "$service/server.js"; then
            if ! grep -q "parameterized" "$service/server.js"; then
                echo -e "${RED}✗ Potential SQL injection risk in $service${NC}"
            fi
        fi
    fi
done

# Check for proper session handling
echo -e "\nChecking session management..."
for service in bases_de_datos asistencia nomina; do
    if [ -f "$service/server.js" ]; then
        if ! grep -q "express-session" "$service/server.js"; then
            echo -e "${RED}✗ Missing session management in $service${NC}"
        fi
    fi
done

echo -e "\n5️⃣ Monitoring Checks"
echo "-------------------"

# Check for health check endpoints
echo "Checking health endpoints..."
for service in bases_de_datos asistencia nomina; do
    if [ -f "$service/server.js" ]; then
        if ! grep -q "/health" "$service/server.js"; then
            echo -e "${RED}✗ Missing health check endpoint in $service${NC}"
        fi
    fi
done

# Check for logging configuration
echo -e "\nChecking logging setup..."
for service in bases_de_datos asistencia nomina; do
    if [ -f "$service/server.js" ]; then
        if ! grep -q "winston" "$service/server.js"; then
            echo -e "${RED}✗ Missing logging configuration in $service${NC}"
        fi
    fi
done

echo -e "\n6️⃣ Deployment Checks"
echo "-------------------"

# Check for container health checks
echo "Checking container health checks..."
if ! grep -q "healthcheck:" docker-compose.yml; then
    echo -e "${RED}✗ Missing container health checks${NC}"
fi

# Check for backup configuration
echo -e "\nChecking backup configuration..."
if [ ! -f backup_script.sh ]; then
    echo -e "${RED}✗ No backup script found${NC}"
fi

echo -e "\n7️⃣ Additional Security Checks"
echo "---------------------------"

# Check for security headers
echo "Checking security headers..."
for service in bases_de_datos asistencia nomina; do
    if [ -f "$service/server.js" ]; then
        if ! grep -q "Content-Security-Policy" "$service/server.js"; then
            echo -e "${RED}✗ Missing CSP headers in $service${NC}"
        fi
    fi
done

echo -e "\n📋 Summary"
echo "----------"
echo -e "${YELLOW}Run 'docker-compose ps' to see current container status${NC}"
echo -e "${YELLOW}Run 'docker-compose logs' to check for any security-related logs${NC}"
