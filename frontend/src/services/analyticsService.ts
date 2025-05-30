// Analytics service for tracking form submissions and user interactions
// This service provides an abstraction layer for various analytics providers

type EventType = 'form_submit' | 'form_view' | 'form_error' | 'cv_upload' | 'page_view';

interface EventData {
  userType?: 'employee' | 'employer';
  formName?: string;
  status?: 'success' | 'error' | 'attempt';
  errorType?: string;
  errorMessage?: string;
  [key: string]: any; // Allow additional properties
}

class AnalyticsService {
  private isInitialized = false;
  
  /**
   * Initialize analytics service
   * This should be called on app startup
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    // Load Google Analytics (GA4) script
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      this.loadGoogleAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID);
    }
    
    this.isInitialized = true;
    console.log('Analytics service initialized');
  }
  
  /**
   * Track an event
   * @param eventType Type of event to track
   * @param eventData Additional data to send with the event
   */
  trackEvent(eventType: EventType, eventData: EventData = {}): void {
    if (!this.isInitialized) {
      console.warn('Analytics service not initialized');
      return;
    }
    
    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', eventType, {
        ...eventData,
        event_category: 'form',
        event_label: eventData.userType || 'unspecified',
        timestamp: new Date().toISOString()
      });
      console.log(`Tracked event: ${eventType}`, eventData);
    }
    
    // Add server-side tracking here if needed
    // This could send data to your own API endpoint
  }
  
  /**
   * Track form submission
   * @param userType Type of user (employee or employer)
   * @param status Submission status (success or error)
   * @param data Additional data
   */
  trackFormSubmission(userType: 'employee' | 'employer', status: 'success' | 'error', data: Record<string, any> = {}): void {
    this.trackEvent('form_submit', {
      userType,
      status,
      formName: 'start_free',
      ...data
    });
  }
  
  /**
   * Track form errors
   * @param userType Type of user (employee or employer)
   * @param errorType Type of error
   * @param errorMessage Error message
   */
  trackFormError(userType: 'employee' | 'employer', errorType: string, errorMessage: string): void {
    this.trackEvent('form_error', {
      userType,
      errorType,
      errorMessage,
      formName: 'start_free'
    });
  }
  
  /**
   * Track CV upload
   * @param fileSize Size of the file in bytes
   * @param fileType File type (e.g., application/pdf)
   * @param status Upload status
   */
  trackCVUpload(fileSize: number, fileType: string, status: 'success' | 'error'): void {
    this.trackEvent('cv_upload', {
      userType: 'employee',
      fileSize,
      fileType,
      status
    });
  }
  
  /**
   * Load Google Analytics script
   * @param measurementId GA4 measurement ID
   */
  private loadGoogleAnalytics(measurementId: string): void {
    if (typeof window === 'undefined' || document.getElementById('ga-script')) {
      return;
    }
    
    // Create script tags for Google Analytics
    const script1 = document.createElement('script');
    script1.id = 'ga-script';
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    
    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    `;
    
    // Add scripts to the document
    document.head.appendChild(script1);
    document.head.appendChild(script2);
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;
