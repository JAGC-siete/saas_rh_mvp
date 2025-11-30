/**
 * Mock implementation of the Hikvision ISAPI client.
 * This class simulates the behavior of the real library for development and testing purposes,
 * allowing the application to build and run without the actual private package.
 */
export class HikvisionISAPI {
  private config: any;

  constructor(config: any) {
    this.config = config;
    console.log(`[Mock HikvisionISAPI] Client initialized for host: ${config.host}`);
  }

  // Mock for UserInfo management
  public UserInfo = {
    addOrUpdate: async (employeeData: any): Promise<{ success: boolean; data: any }> => {
      console.log(`[Mock HikvisionISAPI] Simulating AddOrUpdate for employee DNI: ${employeeData.employeeNo}`);
      // Simulate a potential conflict error
      if (employeeData.employeeNo === '0000') {
        const error: any = new Error("Conflict");
        error.isapi = { statusCode: 26, statusString: "Employee ID or Card Number Conflict" };
        throw error;
      }
      return { success: true, data: { status: 'OK' } };
    },
    // Add other user-related methods as needed
  };

  // Mock for System info
  public System = {
    getSystemInfo: async (): Promise<{ success: boolean; data: any }> => {
      console.log(`[Mock HikvisionISAPI] Simulating getSystemInfo`);
      return {
        success: true,
        data: {
          deviceName: 'MockDevice',
          firmwareVersion: 'v1.0.0-mock',
        },
      };
    },
  };

  // Mock for Event management
  public Event = {
    setNotificationServer: async (serverConfig: any): Promise<{ success: boolean; data: any }> => {
      console.log(`[Mock HikvisionISAPI] Simulating setNotificationServer to URL: ${serverConfig.url}`);
      return { success: true, data: { status: 'OK' } };
    },
  };
}

