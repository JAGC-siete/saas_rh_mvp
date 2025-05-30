// Manatal API configuration
export const MANATAL_API = {
  BASE_URL: 'https://api.manatal.com/open/v3',
  // Token is retrieved from environment variable or fallback to hardcoded value
  // In a production environment, this should be handled server-side
  TOKEN: import.meta.env.VITE_MANATAL_API_TOKEN || '5ae4382cab6e503119634f2f594bee928f3921c8',
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
        message: data.detail || 'An unknown error occurred',
        details: data
      };
      
      if (status === 401) {
        error.code = 'UNAUTHORIZED';
        error.message = 'API authentication failed';
      } else if (status === 400) {
        error.code = 'VALIDATION_ERROR';
        error.message = 'Invalid request data';
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
