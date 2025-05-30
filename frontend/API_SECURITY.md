# API Security Notes

## Securing API Tokens

The current implementation has the Manatal API token hardcoded in the frontend code with a fallback to an environment variable. This is not ideal for production environments.

### Best Practices for Production

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
   NEXT_PUBLIC_MANATAL_API_TOKEN=your_api_token
   ```

4. **Server-side Proxy Example**:
   Create a server route that handles the API requests:
   ```javascript
   // Example with Next.js API route
   // pages/api/manatal/candidates.js
   import axios from 'axios';

   export default async function handler(req, res) {
     if (req.method !== 'POST') {
       return res.status(405).json({ error: 'Method not allowed' });
     }

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
   }
   ```

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
