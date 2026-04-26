import axios, { AxiosInstance, AxiosError } from 'axios';
import { createHash } from 'crypto';

interface HikvisionSdkOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  timeout?: number;
}

interface DigestAuthHeaders {
  realm: string;
  qop: string;
  nonce: string;
  opaque?: string;
}

/**
 * A lightweight SDK for interacting with the Hikvision ISAPI (RESTful) interface.
 * This implementation handles the Digest Authentication flow required by the devices.
 * 
 * Based on Hikvision ISAPI manual requirements:
 * - HTTP 1.1 + Digest Authentication (RFC 2617)
 * - RESTful API endpoints
 * - JSON/XML format support
 */
export class HikvisionSDK {
  private axiosInstance: AxiosInstance;
  private options: HikvisionSdkOptions;
  private digestAuthHeaders: DigestAuthHeaders | null = null;
  private nc = 1; // nonce count, must be incremented for each request

  constructor(options: HikvisionSdkOptions) {
    this.options = options;
    this.axiosInstance = axios.create({
      baseURL: `http://${options.host}:${options.port}`,
      timeout: options.timeout || 30000, // 30 seconds for ISAPI operations (devices may be on slow networks)
    });

    this.setupAuthInterceptor();
  }

  private parseWwwAuthenticateHeader(header: string): DigestAuthHeaders {
    const params = header.substring(header.indexOf(' ') + 1)
      .split(',')
      .reduce((acc, part) => {
        const [key, value] = part.trim().split('=');
        acc[key] = value.replace(/"/g, '');
        return acc;
      }, {} as any);
    return params;
  }

  private generateDigestResponse(method: string, uri: string): string {
    if (!this.digestAuthHeaders) {
      throw new Error("Cannot generate digest response without auth headers.");
    }

    const ha1 = createHash('md5').update(`${this.options.user}:${this.digestAuthHeaders.realm}:${this.options.pass}`).digest('hex');
    const ha2 = createHash('md5').update(`${method}:${uri}`).digest('hex');
    const cnonce = createHash('md5').update(Math.random().toString()).digest('hex');
    const ncString = this.nc.toString().padStart(8, '0');

    const response = createHash('md5')
      .update(`${ha1}:${this.digestAuthHeaders.nonce}:${ncString}:${cnonce}:${this.digestAuthHeaders.qop}:${ha2}`)
      .digest('hex');

    this.nc++;

    return `Digest username="${this.options.user}", realm="${this.digestAuthHeaders.realm}", nonce="${this.digestAuthHeaders.nonce}", uri="${uri}", qop=${this.digestAuthHeaders.qop}, nc=${ncString}, cnonce="${cnonce}", response="${response}", opaque="${this.digestAuthHeaders.opaque}"`;
  }

  private setupAuthInterceptor() {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && originalRequest && !originalRequest.headers['Authorization']) {
          console.log(`[HikvisionSDK] Received 401 Unauthorized. Initiating Digest Auth flow for ${this.options.host}...`);
          
          const wwwAuthenticateHeader = error.response.headers['www-authenticate'];
          if (wwwAuthenticateHeader) {
            this.digestAuthHeaders = this.parseWwwAuthenticateHeader(wwwAuthenticateHeader);
            
            const authHeader = this.generateDigestResponse(originalRequest.method!.toUpperCase(), originalRequest.url!);
            originalRequest.headers['Authorization'] = authHeader;
            
            console.log(`[HikvisionSDK] Retrying request with Digest Auth header for ${this.options.host}`);
            return this.axiosInstance(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.request.use(
        (config) => {
            if (this.digestAuthHeaders && !config.headers['Authorization']) {
                const authHeader = this.generateDigestResponse(config.method!.toUpperCase(), config.url!);
                config.headers['Authorization'] = authHeader;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );
  }

  // --- Public SDK Methods ---

  /**
   * Get system information from the device.
   * Often used as a lightweight "ping" or health check.
   */
  public async getSystemInfo() {
    const response = await this.axiosInstance.get('/ISAPI/System/deviceInfo?format=json');
    return response.data;
  }

  /**
   * Set up user information on the device.
   * Used for employee synchronization.
   */
  public async userInfoSetUp(employeeData: any) {
    const payload = {
      UserInfo: {
        employeeNo: String(employeeData.employeeNo),
        name: employeeData.name,
        userType: "normal",
        doorRight: "1",
        Valid: {
          enable: true,
          beginTime: "2024-01-01T00:00:00",
          endTime: "2034-12-31T23:59:59"
        }
      }
    };
    const response = await this.axiosInstance.put('/ISAPI/AccessControl/UserInfo/SetUp?format=json', payload);
    return response.data;
  }

  /**
   * Get capabilities for HTTP notification hosts.
   * Returns information about supported protocols, formats, and limits.
   * Based on ISAPI manual: GET /ISAPI/Event/notification/httpHosts/capabilities
   */
  public async getHttpHostsCapabilities() {
    const response = await this.axiosInstance.get('/ISAPI/Event/notification/httpHosts/capabilities?format=json');
    return response.data;
  }

  /**
   * Configure HTTP notification server (httpHosts) on the device.
   * Based on ISAPI manual: PUT /ISAPI/Event/notification/httpHosts
   * 
   * This method:
   * 1. Optionally checks capabilities
   * 2. Constructs XML_HttpHostNotificationList according to ISAPI spec
   * 3. Sends PUT request to configure the notification server
   * 4. Tests the configuration using POST /httpHosts/<ID>/test
   * 
   * @param params Configuration parameters
   * @param params.webhookUrl Full webhook URL (e.g., https://app.humanosisu.net/api/webhooks/attendance?company_id=XYZ)
   * @param params.hostId HTTP host ID (default: "1")
   * @returns Object with success status and test result
   */
  public async setNotificationServer(params: {
    webhookUrl: string;
    hostId?: string;
  }): Promise<{ success: boolean; testResult?: any; error?: string }> {
    const hostId = params.hostId || '1';

    try {
      // Step 1: (Optional) Get capabilities to validate support
      try {
        const capabilities = await this.getHttpHostsCapabilities();
        console.log(`[HikvisionSDK] Device capabilities:`, capabilities);
      } catch (capError) {
        console.warn(`[HikvisionSDK] Could not fetch capabilities, continuing anyway:`, capError);
        // Continue even if capabilities check fails
      }

      // Step 2: Parse webhook URL to extract components
      const webhookUrlObj = new URL(params.webhookUrl);
      const hostName = webhookUrlObj.hostname;
      const portNo = webhookUrlObj.port || (webhookUrlObj.protocol === 'https:' ? '443' : '80');
      
      // Determine protocol type based on URL scheme (HTTPS or HTTP)
      // According to ISAPI manual, some devices treat HTTPS as HTTP + port 443,
      // but it's better to be explicit about the protocol
      const protocolType = webhookUrlObj.protocol === 'https:' ? 'HTTPS' : 'HTTP';

      // Step 3: Construct XML_HttpHostNotificationList according to ISAPI manual
      const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<HttpHostNotificationList version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
  <HttpHostNotification>
    <id>${hostId}</id>
    <url>${params.webhookUrl}</url>
    <protocolType>${protocolType}</protocolType>
    <parameterFormatType>JSON</parameterFormatType>
    <addressingFormatType>hostname</addressingFormatType>
    <hostName>${hostName}</hostName>
    <portNo>${portNo}</portNo>
    <httpAuthenticationMethod>none</httpAuthenticationMethod>
    <eventMode>all</eventMode>
  </HttpHostNotification>
</HttpHostNotificationList>`;

      console.log(`[HikvisionSDK] Configuring HTTP notification server with XML:`, xmlBody);

      // Step 4: PUT /ISAPI/Event/notification/httpHosts
      const putResponse = await this.axiosInstance.put(
        '/ISAPI/Event/notification/httpHosts',
        xmlBody,
        {
          headers: {
            'Content-Type': 'application/xml',
          },
        }
      );

      console.log(`[HikvisionSDK] PUT httpHosts response:`, putResponse.data);

      // Step 5: Test the configured httpHost using POST /ISAPI/Event/notification/httpHosts/<ID>/test
      const testXmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<HttpHostNotification xmlns="http://www.isapi.org/ver20/XMLSchema">
  <id>${hostId}</id>
</HttpHostNotification>`;

      console.log(`[HikvisionSDK] Testing HTTP notification server with ID ${hostId}...`);

      const testResponse = await this.axiosInstance.post(
        `/ISAPI/Event/notification/httpHosts/${hostId}/test`,
        testXmlBody,
        {
          headers: {
            'Content-Type': 'application/xml',
          },
        }
      );

      console.log(`[HikvisionSDK] Test result:`, testResponse.data);

      // Parse XML response to check if test succeeded
      // The response should be XML_HttpHostTestResult according to ISAPI manual
      const testResult = testResponse.data;
      let isSuccess = false;
      
      if (typeof testResult === 'string') {
        // XML string response - check for succeeded status
        // ISAPI returns: <HttpHostTestResult><status>succeeded</status> or <status>failed</status>
        isSuccess = testResult.includes('<status>succeeded</status>') || 
                   testResult.includes('status="succeeded"') ||
                   testResult.includes('succeeded');
      } else if (testResult && typeof testResult === 'object') {
        // JSON response (if device supports JSON format)
        isSuccess = testResult.status === 'succeeded' ||
                   (testResult.HttpHostTestResult && testResult.HttpHostTestResult.status === 'succeeded');
      }

      return {
        success: isSuccess,
        testResult: testResult,
      };

    } catch (error: any) {
      console.error(`[HikvisionSDK] Error configuring notification server:`, error);
      
      // Try to extract error details from XML/JSON response
      let errorMessage = error.message;
      if (error.response?.data) {
        const responseData = error.response.data;
        
        if (typeof responseData === 'string') {
          // XML error response - extract statusString if present
          // ISAPI error format: <ResponseStatus><statusCode>...</statusCode><statusString>...</statusString></ResponseStatus>
          const statusStringMatch = responseData.match(/<statusString>(.*?)<\/statusString>/);
          const statusCodeMatch = responseData.match(/<statusCode>(.*?)<\/statusCode>/);
          
          if (statusStringMatch) {
            errorMessage = `ISAPI Error: ${statusStringMatch[1]}`;
          } else if (statusCodeMatch) {
            errorMessage = `ISAPI Error Code: ${statusCodeMatch[1]}`;
          } else {
            errorMessage = `ISAPI Error: ${responseData.substring(0, 200)}`;
          }
        } else if (responseData.statusString) {
          // JSON error response
          errorMessage = `ISAPI Error: ${responseData.statusString}`;
        } else if (responseData.statusCode) {
          errorMessage = `ISAPI Error Code: ${responseData.statusCode}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

