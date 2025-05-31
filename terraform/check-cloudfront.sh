#!/bin/bash

# Script to check CloudFront distribution info and status

# CloudFront Distribution ID from staging.tfvars
DISTRIBUTION_ID="E3JC3C46Y6RAHD"

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}   CloudFront Distribution Information    ${NC}"
echo -e "${BLUE}==========================================${NC}"

# Check if the AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Get distribution info
echo -e "${YELLOW}Fetching CloudFront distribution info...${NC}"
DISTRIBUTION_INFO=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID 2>&1)

if [[ $? -ne 0 ]]; then
    echo -e "${RED}Error fetching distribution info: ${DISTRIBUTION_INFO}${NC}"
    exit 1
fi

# Extract and display relevant information
DOMAIN_NAME=$(echo "$DISTRIBUTION_INFO" | grep -o '"DomainName": "[^"]*"' | cut -d'"' -f4)
STATUS=$(echo "$DISTRIBUTION_INFO" | grep -o '"Status": "[^"]*"' | cut -d'"' -f4)
ORIGIN=$(echo "$DISTRIBUTION_INFO" | grep -o '"DomainName": "www.humanosisu.com.s3[^"]*"' | cut -d'"' -f4)
ENABLED=$(echo "$DISTRIBUTION_INFO" | grep -o '"Enabled": [a-z]*' | cut -d' ' -f2)
COMMENT=$(echo "$DISTRIBUTION_INFO" | grep -o '"Comment": "[^"]*"' | cut -d'"' -f4)

echo -e "${GREEN}Distribution ID:${NC} $DISTRIBUTION_ID"
echo -e "${GREEN}Domain Name:${NC} $DOMAIN_NAME"
echo -e "${GREEN}Status:${NC} $STATUS"
echo -e "${GREEN}Origin:${NC} $ORIGIN"
echo -e "${GREEN}Enabled:${NC} $ENABLED"
echo -e "${GREEN}Comment:${NC} $COMMENT"

# Get recent invalidations
echo -e "\n${YELLOW}Fetching recent invalidations...${NC}"
INVALIDATIONS=$(aws cloudfront list-invalidations --distribution-id $DISTRIBUTION_ID 2>&1)

if [[ $? -ne 0 ]]; then
    echo -e "${RED}Error fetching invalidations: ${INVALIDATIONS}${NC}"
else
    # Extract and display recent invalidations
    echo "$INVALIDATIONS" | grep -o '"Id": "[^"]*"' | cut -d'"' -f4 | while read -r id; do
        INV_INFO=$(aws cloudfront get-invalidation --distribution-id $DISTRIBUTION_ID --id $id 2>/dev/null)
        INV_STATUS=$(echo "$INV_INFO" | grep -o '"Status": "[^"]*"' | cut -d'"' -f4)
        INV_CREATETIME=$(echo "$INV_INFO" | grep -o '"CreateTime": "[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}Invalidation ID:${NC} $id"
        echo -e "${GREEN}  Status:${NC} $INV_STATUS"
        echo -e "${GREEN}  Created:${NC} $INV_CREATETIME"
    done
fi

# Check the website availability
echo -e "\n${YELLOW}Checking website availability...${NC}"
RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN_NAME)

if [[ $RESPONSE_CODE -ge 200 && $RESPONSE_CODE -lt 300 ]]; then
    echo -e "${GREEN}Website is accessible (HTTP $RESPONSE_CODE)${NC}"
elif [[ $RESPONSE_CODE -ge 300 && $RESPONSE_CODE -lt 400 ]]; then
    echo -e "${YELLOW}Website returned a redirect (HTTP $RESPONSE_CODE)${NC}"
else
    echo -e "${RED}Website is not accessible (HTTP $RESPONSE_CODE)${NC}"
fi

echo -e "\n${BLUE}==========================================${NC}"
echo -e "${BLUE}           Check Complete                ${NC}"
echo -e "${BLUE}==========================================${NC}"
