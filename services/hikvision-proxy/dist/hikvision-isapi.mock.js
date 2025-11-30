"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HikvisionISAPI = void 0;
/**
 * Mock implementation of the Hikvision ISAPI client.
 * This class simulates the behavior of the real library for development and testing purposes,
 * allowing the application to build and run without the actual private package.
 */
class HikvisionISAPI {
    config;
    constructor(config) {
        this.config = config;
        console.log(`[Mock HikvisionISAPI] Client initialized for host: ${config.host}`);
    }
    // Mock for UserInfo management
    UserInfo = {
        addOrUpdate: async (employeeData) => {
            console.log(`[Mock HikvisionISAPI] Simulating AddOrUpdate for employee DNI: ${employeeData.employeeNo}`);
            // Simulate a potential conflict error
            if (employeeData.employeeNo === '0000') {
                const error = new Error("Conflict");
                error.isapi = { statusCode: 26, statusString: "Employee ID or Card Number Conflict" };
                throw error;
            }
            return { success: true, data: { status: 'OK' } };
        },
        // Add other user-related methods as needed
    };
    // Mock for System info
    System = {
        getSystemInfo: async () => {
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
    Event = {
        setNotificationServer: async (serverConfig) => {
            console.log(`[Mock HikvisionISAPI] Simulating setNotificationServer to URL: ${serverConfig.url}`);
            return { success: true, data: { status: 'OK' } };
        },
    };
}
exports.HikvisionISAPI = HikvisionISAPI;
