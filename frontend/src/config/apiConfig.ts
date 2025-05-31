// Manatal API configuration
export const MANATAL_API = {
  BASE_URL: 'https://api.manatal.com/open/v3',
  // Token is retrieved from environment variable only
  // In a production environment, this should be handled server-side
  TOKEN: import.meta.env.VITE_MANATAL_API_TOKEN || 'placeholder_token_needs_env_variable',
  ENDPOINTS: {
    CANDIDATES: '/candidates/',
    ORGANIZATIONS: '/organizations/',
    CANDIDATE_RESUME: (id: string) => `/candidates/${id}/resume/`,
  }
};

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// API response handling
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
  success: boolean;
}

// API Helper functions
export const apiHeaders = (includeContentType = true) => {
  const headers: Record<string, string> = {
    accept: 'application/json',
    Authorization: `Token ${MANATAL_API.TOKEN}`
  };
  
  if (includeContentType) {
    headers['content-type'] = 'application/json';
  }
  
  return headers;
};

/**
 * Process API response and handle errors
 * @param response Fetch API response object
 * @returns Structured API response with data or error
 */
export async function processApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const status = response.status;
  
  try {
    const data = await response.json();
    
    if (response.ok) {
      return {
        data: data as T,
        status,
        success: true
      };
    } else {
      // Handle API error responses
      const error: ApiError = {
        code: 'API_ERROR',
        message: 'An unknown error occurred',
        details: data
      };
      
      // Format error message based on Manatal API response format
      if (typeof data === 'object') {
        // Manatal API might return errors in different formats
        if (data.detail) {
          error.message = data.detail;
        } else if (data.message) {
          error.message = data.message;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          // Handle non-field errors array
          error.message = data.non_field_errors.join('; ');
        } else {
          // Handle field validation errors (e.g. {"full_name": ["This field is required."]})
          const errorMessages: string[] = [];
          
          Object.entries(data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            } else if (typeof messages === 'object' && messages !== null) {
              // Handle nested error objects
              const nestedErrors = Object.entries(messages)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
              errorMessages.push(`${field}: ${nestedErrors}`);
            }
          });
          
          if (errorMessages.length > 0) {
            error.message = errorMessages.join('; ');
          }
        }
      }
      
      if (status === 401) {
        error.code = 'UNAUTHORIZED';
        error.message = 'API authentication failed';
      } else if (status === 400) {
        error.code = 'VALIDATION_ERROR';
        if (error.message === 'An unknown error occurred') {
          error.message = 'Invalid request data';
        }
      } else if (status === 404) {
        error.code = 'NOT_FOUND';
        error.message = 'Resource not found';
      } else if (status >= 500) {
        error.code = 'SERVER_ERROR';
        error.message = 'Server error, please try again later';
      }
      
      return {
        error,
        status,
        success: false
      };
    }
  } catch (error) {
    // Handle JSON parsing or network errors
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network or parsing error',
        details: { originalError: error }
      },
      status: status || 0,
      success: false
    };
  }
};
