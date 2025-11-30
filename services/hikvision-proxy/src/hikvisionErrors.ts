/**
 * Hikvision ISAPI Error Code Mapper
 * This utility translates known ISAPI error codes into human-readable messages.
 * This list is not exhaustive and should be expanded as new errors are encountered.
 */
const ISAPI_ERROR_CODES: { [key: number]: string } = {
  1: 'Invalid Operation',
  2: 'Invalid Parameter',
  3: 'Invalid State',
  4: 'Operation Failed',
  5: 'Memory Error',
  6: 'File Operation Error',
  7: 'Device Busy',
  8: 'Permission Denied',
  9: 'Not Supported',
  10: 'Resource Not Found',
  11: 'Authentication Failed',
  26: 'Employee ID or Card Number Conflict/Exists',
  27: 'Employee Not Found',
  40: 'Device Storage is Full (e.g., no more space for faces)',
  // Add more known error codes here...
};

interface HikvisionError extends Error {
  isapi?: {
    statusCode?: number;
    statusString?: string;
  };
}

/**
 * Translates a Hikvision ISAPI error into a readable string.
 * @param error The error object, which may contain ISAPI-specific details.
 * @param deviceId The ID of the device that produced the error.
 * @returns A formatted, human-readable error message.
 */
export function translateHikvisionError(error: HikvisionError, deviceId: string): string {
  const statusCode = error.isapi?.statusCode;

  if (statusCode && ISAPI_ERROR_CODES[statusCode]) {
    return `[DeviceID: ${deviceId}] Hikvision API Error ${statusCode}: ${ISAPI_ERROR_CODES[statusCode]}. (${error.isapi?.statusString || 'No status string'})`;
  }

  if (statusCode) {
    return `[DeviceID: ${deviceId}] Unknown Hikvision API Error ${statusCode}: ${error.isapi?.statusString || 'No status string'}`;
  }

  return `[DeviceID: ${deviceId}] A non-API error occurred: ${error.message}`;
}

