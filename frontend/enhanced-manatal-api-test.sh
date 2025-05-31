#!/bin/bash

echo "Enhanced Manatal API Integration Test"
echo "===================================="
echo "Testing with improved fields and error handling"

API_TOKEN="${MANATAL_API_TOKEN:-placeholder_needs_real_token}"
API_BASE="https://api.manatal.com/open/v3"

# Function to print responses in a readable format
format_response() {
  if command -v jq &> /dev/null; then
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
  else
    echo "$1"
  fi
}

# Test authentication
echo -e "\n1. Testing authentication with API token:"
AUTH_RESPONSE=$(curl -s -X GET "$API_BASE/candidates/" -H "Authorization: Token $API_TOKEN" -H "Accept: application/json")
if [[ $AUTH_RESPONSE == *"Authentication credentials were not provided"* ]]; then
  echo "❌ Authentication failed. Check your API token."
  exit 1
else
  echo "✅ Authentication successful!"
fi

# Test candidate creation with all required fields
echo -e "\n2. Testing candidate creation with required fields:"
TIMESTAMP=$(date +%s)
EMAIL="test-$TIMESTAMP@example.com"

CANDIDATE_RESPONSE=$(curl -s -X POST "$API_BASE/candidates/" \
  -H "Authorization: Token $API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "full_name": "Test User",
    "email": "'"$EMAIL"'",
    "phone": "123456789",
    "position": "Software Developer",
    "stage": "Initial Contact",
    "source": "Humano SISU Website Test",
    "note": "Testing improved API integration",
    "tags": ["test", "api_validation"]
  }')

echo "Candidate creation response:"
format_response "$CANDIDATE_RESPONSE"

# Extract candidate ID if available
CANDIDATE_ID=$(echo "$CANDIDATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -n "$CANDIDATE_ID" ]; then
  echo "✅ Candidate created successfully with ID: $CANDIDATE_ID"
  
  # Test resume upload for the candidate
  echo -e "\n3. Testing resume upload for candidate:"
  
  # Create a simple test PDF file
  echo "Creating test PDF file..."
  TEST_PDF="/tmp/test-cv-$TIMESTAMP.pdf"
  echo "%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Resources<<>>>>endobj
trailer<</Root 1 0 R/Size 4>>
%%EOF" > "$TEST_PDF"
  
  # Upload the test PDF
  UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/candidates/$CANDIDATE_ID/resume/" \
    -H "Authorization: Token $API_TOKEN" \
    -H "Accept: application/json" \
    -F "file=@$TEST_PDF")
  
  echo "Resume upload response:"
  format_response "$UPLOAD_RESPONSE"
  
  # Check if upload was successful
  if [[ "$UPLOAD_RESPONSE" == *"id"* ]]; then
    echo "✅ Resume uploaded successfully!"
  else
    echo "❌ Resume upload failed!"
  fi
  
  # Clean up test file
  rm -f "$TEST_PDF"
  
  # Test organization creation
  echo -e "\n4. Testing organization creation with job opening:"
  ORG_EMAIL="org-$TIMESTAMP@test.com"
  
  ORGANIZATION_RESPONSE=$(curl -s -X POST "$API_BASE/organizations/" \
    -H "Authorization: Token $API_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{
      "name": "Test Company Enhanced",
      "industry": "Technology",
      "contact": {
        "name": "Test Contact",
        "email": "'"$ORG_EMAIL"'",
        "phone": "123456789"
      },
      "job_openings": [
        {
          "title": "Software Developer",
          "description": "Test job description with improved fields",
          "requirements": "Test skills required",
          "benefits": "Test benefits offered",
          "status": "active"
        }
      ],
      "notes": "From Humano SISU website test with enhanced fields",
      "tags": ["website_test", "enhanced_fields"]
    }')
  
  echo "Organization creation response:"
  format_response "$ORGANIZATION_RESPONSE"
  
  # Check if organization creation was successful
  if [[ "$ORGANIZATION_RESPONSE" == *"id"* ]]; then
    echo "✅ Organization created successfully!"
  else
    echo "❌ Organization creation failed!"
  fi
else
  echo "❌ Candidate creation failed! Skipping resume upload and organization tests."
fi

echo -e "\nTests completed."
