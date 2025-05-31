# Analytics Implementation Guide

## Overview
This document outlines the analytics implementation for the Humano SISU website. It tracks user interactions with the "Start Free" form and captures important metrics about form submissions and errors.

## Events Tracked

### Page Views
- **Event:** `page_view`
- **Data:** 
  - `page`: Page name/identifier
  - `timestamp`: When the view occurred

### Form Submissions
- **Event:** `form_submit`
- **Data:**
  - `userType`: 'employee' or 'employer'
  - `status`: 'success', 'error', or 'attempt'
  - `formName`: Form identifier
  - Additional metadata depending on form type

### Form Errors
- **Event:** `form_error`
- **Data:**
  - `userType`: 'employee' or 'employer'
  - `errorType`: Type of error (VALIDATION, API_ERROR, etc.)
  - `errorMessage`: Detailed error message
  - `formName`: Form identifier

### CV Uploads
- **Event:** `cv_upload`
- **Data:**
  - `userType`: Always 'employee'
  - `fileSize`: Size of uploaded file in bytes
  - `fileType`: MIME type of the file
  - `status`: 'success' or 'error'

## Implementation

The analytics service is implemented in `src/services/analyticsService.ts` and provides a consistent interface for tracking events across the application. It supports Google Analytics 4 (GA4) out of the box and can be extended to support other analytics providers.

### Setting Up Google Analytics

1. Create a Google Analytics 4 property in the Google Analytics console
2. Get your Measurement ID (format: G-XXXXXXXXXX)
3. Add it to the environment variables:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

### Tracking Custom Events

```typescript
// Import the service
import analyticsService from '@services/analyticsService';

// Initialize once (usually in the root component)
analyticsService.initialize();

// Track a simple event
analyticsService.trackEvent('page_view', { page: 'homepage' });

// Track form submission
analyticsService.trackFormSubmission(
  'employer',  // userType
  'success',   // status
  { industry: 'technology' } // additional data
);

// Track form error
analyticsService.trackFormError(
  'employee',           // userType
  'VALIDATION_ERROR',   // errorType
  'Email is required'   // errorMessage
);

// Track CV upload
analyticsService.trackCVUpload(
  1024000,            // fileSize in bytes
  'application/pdf',  // fileType
  'success'           // status
);
```

## Viewing Analytics Data

1. Go to Google Analytics dashboard: https://analytics.google.com/
2. Navigate to Reports > Realtime to see data streaming in
3. For historical data, check Reports > Engagement > Events

## Adding New Tracking

When adding new tracking, follow these steps:

1. Identify the key user interactions to track
2. Define the event name and data structure
3. Add tracking calls at appropriate points in the code
4. Verify events are being received in Google Analytics

## Privacy Considerations

- Make sure your privacy policy covers analytics data collection
- Provide users with information about data collected
- Consider adding cookie consent for regions where required (EU/GDPR)
