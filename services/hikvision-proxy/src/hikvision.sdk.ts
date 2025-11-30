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
      timeout: options.timeout || 10000,
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

  public async getSystemInfo() {
    // This is often used as a lightweight "ping" or health check.
    const response = await this.axiosInstance.get('/ISAPI/System/deviceInfo?format=json');
    return response.data;
  }

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
}

