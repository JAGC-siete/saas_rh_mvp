#!/bin/bash

echo "Testing Manatal API Integration"
echo "=============================="

API_TOKEN="${MANATAL_API_TOKEN:-placeholder_needs_real_token}"
API_BASE="https://api.manatal.com/open/v3"

echo -e "\n1. Testing authentication with a GET request to candidates endpoint:"
curl -s -I -X GET "$API_BASE/candidates/" \
  -H "Authorization: Token $API_TOKEN" \
  -H "Accept: application/json" | head -n 1

echo -e "\n2. Testing candidate creation:"
CANDIDATE_RESPONSE=$(curl -s -X POST "$API_BASE/candidates/" \
  -H "Authorization: Token $API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "full_name": "Test User",
    "email": "test-'$(date +%s)'@example.com",
    "phone": "123456789",
    "position": "Software Developer",
    "stage": "Initial Contact",
    "source": "Humano SISU Website Test"
  }')

echo "Candidate creation response:"
echo "$CANDIDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$CANDIDATE_RESPONSE"

# Extract candidate ID if available
CANDIDATE_ID=$(echo "$CANDIDATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -n "$CANDIDATE_ID" ]; then
  echo -e "\n3. Testing organization creation:"
  ORGANIZATION_RESPONSE=$(curl -s -X POST "$API_BASE/organizations/" \
    -H "Authorization: Token $API_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{
      "name": "Test Company",
      "industry": "Technology",
      "contact": {
        "name": "Test Contact",
        "email": "contact-'$(date +%s)'@test.com",
        "phone": "123456789"
      },
      "job_openings": [
        {
          "title": "Software Developer",
          "description": "Test job description",
          "requirements": "Test skills",
          "benefits": "Test benefits"
        }
      ],
      "notes": "From Humano SISU website test"
    }')

  echo "Organization creation response:"
  echo "$ORGANIZATION_RESPONSE" | jq '.' 2>/dev/null || echo "$ORGANIZATION_RESPONSE"
else
  echo "Skipping organization test due to candidate creation failure"
fi

echo -e "\nTests completed."
