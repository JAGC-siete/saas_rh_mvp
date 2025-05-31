# Manatal API Integration

This document outlines the integration with the Manatal API for handling candidate and employer submissions in the Humano SISU platform.

## Overview

The Manatal API is used to:
- Create candidate profiles from job seeker submissions
- Upload candidate resumes
- Create company profiles and job postings from employer submissions

## API Endpoints

The integration uses the following endpoints:

- **Candidates**: `https://api.manatal.com/open/v3/candidates/`
- **Candidate Resume**: `https://api.manatal.com/open/v3/candidates/{id}/resume/`
- **Organizations**: `https://api.manatal.com/open/v3/organizations/`

## Required Fields

### Candidate Submission
- `first_name`: First name of the candidate
- `last_name`: Last name of the candidate
- `full_name`: Full name of the candidate (required by Manatal)
- `email`: Email address of the candidate
- `phone`: Phone number of the candidate
- `position`: Desired job position
- `stage`: Current stage in recruitment process (default: "Initial Contact")
- `source`: Source of the candidate (default: "Humano SISU Website")
- `note`: Additional notes about the candidate
- `tags`: Array of tags for the candidate

### Organization Submission
- `name`: Company name
- `industry`: Industry of the company
- `contact`: Contact information object
  - `name`: Contact person's name
  - `email`: Contact email
  - `phone`: Contact phone number
- `job_openings`: Array of job openings
  - `title`: Job title
  - `description`: Job description
  - `requirements`: Skills required
  - `benefits`: Benefits offered
  - `status`: Job status (default: "active")
- `notes`: Additional notes about the company
- `tags`: Array of tags for the company

## Error Handling

The integration includes robust error handling to:
1. Process API response errors based on Manatal's error format
2. Handle field validation errors
3. Provide specific error messages to users
4. Track error data in analytics

## File Upload

When uploading candidate resumes:
1. Files must be in PDF or Word format
2. Maximum file size is limited to 5MB
3. File upload happens after successful candidate creation
4. Failed uploads are gracefully handled without failing the entire submission

## Security

API authentication is handled using a token:
- Token is stored in environment variables
- Requests include the token in the Authorization header
- Token should be rotated periodically for security

## Analytics

The integration tracks the following events:
- Form submission attempts
- Successful submissions
- Validation errors
- API errors
- Resume uploads

## Testing

Use the provided test scripts to validate the API integration:
- `test-manatal-api.sh`: Basic API validation
- `enhanced-manatal-api-test.sh`: Comprehensive API testing with all fields

## Future Improvements

Potential future enhancements:
1. Server-side token handling for improved security
2. Implement webhook support for Manatal status updates
3. Add support for bulk candidate uploads
4. Improve error recovery for intermittent API issues
5. Add support for custom fields in the Manatal API
