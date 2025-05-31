# API Security Notes

## Current Implementation

The Manatal API integration currently:
- Uses an API token stored in Vite environment variables with a hardcoded fallback
- Makes API requests directly from the frontend code
- Validates form data on the client side
- Handles API responses and errors in the frontend

## Security Concerns

This implementation has several security considerations:

1. **Client-side token exposure**: The API token is visible in the compiled JavaScript, making it accessible to users through browser developer tools.

2. **Token rotation challenges**: When the token needs to be rotated, it requires a full redeployment of the frontend application.

3. **No request validation**: There's no server-side validation of requests before they're sent to the Manatal API.

4. **Limited rate limiting**: Without a server-side proxy, we cannot effectively implement rate limiting to prevent abuse.

## Best Practices for Production

1. **Server-side Token Handling**:
   - Create a server-side API proxy that handles authentication with Manatal
   - Frontend calls your own backend server which then makes authenticated requests to Manatal
   - This keeps the API token secure on your server

2. **Environment Variables**:
   - Store sensitive information in environment variables
   - For local development: use `.env.local` file (add to .gitignore)
   - For production: set environment variables in your hosting platform

3. **Implementation Steps**:
   ```bash
   # Create a .env.local file in the project root (don't commit this file)
   VITE_MANATAL_API_TOKEN=your_api_token
   ```

4. **Server-side Proxy Example**:
   Create a server route that handles the API requests:
   ```javascript
   // Example with Express API route
   // server/routes/manatal.js
   const express = require('express');
   const axios = require('axios');
   const router = express.Router();

   router.post('/candidates', async (req, res) => {
     try {
       const response = await axios.post(
         'https://api.manatal.com/open/v3/candidates/',
         req.body,
         {
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Token ${process.env.MANATAL_API_TOKEN}`
           }
         }
       );
       
       return res.status(200).json(response.data);
     } catch (error) {
       return res.status(error.response?.status || 500).json({
         error: error.response?.data || 'Internal server error'
       });
     }
   });

   module.exports = router;
   ```

## Implementation Plan

### Short-term (1-2 weeks)
- Add additional client-side validation to prevent obviously malicious requests
- Implement more comprehensive error handling for API responses
- Add enhanced logging for security monitoring

### Medium-term (1-2 months)
- Develop a simple backend proxy API for the Manatal integration
- Move the API token to server-side environment variables
- Update frontend code to use the proxy API instead of direct Manatal API calls

### Long-term (3+ months)
- Implement a comprehensive API management solution
- Add authentication and authorization for all API requests
- Implement automatic token rotation and security monitoring
- Develop a robust logging and alerting system for security events

## Additional Security Considerations

1. **Rate Limiting**:
   - Implement rate limiting to prevent abuse
   - Consider using a service like Cloudflare

2. **CORS Policies**:
   - Configure proper CORS policies for your backend

3. **Input Validation**:
   - Validate all user input before sending to APIs
   - Sanitize data to prevent injection attacks

4. **Error Handling**:
   - Don't expose sensitive information in error messages
   - Log errors properly for debugging

5. **Monitoring**:
   - Set up monitoring for API usage and errors
   - Alert on unusual patterns or error rates

6. **Secure Token Storage**:
   - Store sensitive tokens in secure storage services (AWS Secrets Manager, HashiCorp Vault)
   - Implement automatic token rotation
   - Use different tokens for development/staging/production environments
