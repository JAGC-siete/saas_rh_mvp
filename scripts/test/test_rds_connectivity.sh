#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Testing RDS connectivity in staging environment...${NC}"

# Test 1: Check if RDS endpoint is reachable
echo -e "\n🔍 Test 1: Checking RDS endpoint reachability..."
if nc -zv ${RDS_HOST:-localhost} ${RDS_PORT:-5432} &> /dev/null; then
    echo -e "${GREEN}✅ RDS endpoint is reachable${NC}"
else
    echo -e "${RED}❌ Cannot reach RDS endpoint${NC}"
fi

# Test 2: Attempt to connect using psql
echo -e "\n🔍 Test 2: Testing PostgreSQL connection..."
PGPASSWORD=${DB_PASSWORD:-secret} psql -h ${RDS_HOST:-localhost} -p ${RDS_PORT:-5432} -U ${DB_USER:-admin} -d ${DB_NAME:-saas_db_staging} -c "SELECT 1" &> /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully connected to PostgreSQL${NC}"
else
    echo -e "${RED}❌ Failed to connect to PostgreSQL${NC}"
fi

# Test 3: Check security group configuration
echo -e "\n🔍 Test 3: Checking security group..."
if aws ec2 describe-security-groups --group-ids ${RDS_SECURITY_GROUP:-sg-default} --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]' --output json &> /dev/null; then
    echo -e "${GREEN}✅ Port 5432 is open in security group${NC}"
else
    echo -e "${RED}❌ Port 5432 is not configured in security group${NC}"
fi

# Test 4: Check RDS status
echo -e "\n🔍 Test 4: Checking RDS instance status..."
aws rds describe-db-instances --query 'DBInstances[?DBInstanceIdentifier==`'${RDS_INSTANCE_ID:-saas-staging}'`].DBInstanceStatus' --output text &> /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ RDS instance is running${NC}"
else
    echo -e "${RED}❌ Cannot retrieve RDS status${NC}"
fi

# Test 5: Check health endpoint
echo -e "\n🔍 Test 5: Testing application health endpoint..."
if curl -s http://localhost:3000/health | grep -q '"database":true'; then
    echo -e "${GREEN}✅ Application reports healthy database connection${NC}"
else
    echo -e "${RED}❌ Application reports database connection issues${NC}"
fi
