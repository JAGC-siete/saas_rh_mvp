/**
 * Hikvision ISAPI Error Code Mapper
 * This utility translates known ISAPI error codes into human-readable messages.
 * This list is not exhaustive and should be expanded as new errors are encountered.
 */

interface HikvisionErrorDetails {
  description: string;
  debugSuggestion: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  retryable: boolean;
}

// Based on the ISAPI manual's "Error Codes Categorized by Functional Modules"
// This map uses the 'errorString' as the key for easier lookup from response payloads.
const hikvisionErrorMap: Record<string, HikvisionErrorDetails> = {
  // --- General Errors ---
  'InvalidContent': {
    description: "El contenido de la solicitud (JSON/XML) es inválido o está mal formado.",
    debugSuggestion: "Verificar la sintaxis del payload enviado. Asegurarse de que todos los campos requeridos estén presentes.",
    severity: 'ERROR',
    retryable: false,
  },
  'DeviceBusy': {
    description: "El dispositivo está ocupado procesando otra tarea y no puede atender la solicitud.",
    debugSuggestion: "Esperar un momento y reintentar la operación. Implementar un backoff exponencial.",
    severity: 'WARN',
    retryable: true,
  },
  'DeviceError': {
    description: "Error interno genérico en el dispositivo.",
    debugSuggestion: "Revisar los logs del dispositivo si es posible. Puede ser un problema de hardware o firmware.",
    severity: 'ERROR',
    retryable: false,
  },
  'NoPermission': {
    description: "El usuario autenticado no tiene permisos para realizar esta operación.",
    debugSuggestion: "Verificar los permisos del usuario configurado en el dispositivo. Asegurarse de que tenga acceso al módulo ISAPI correspondiente.",
    severity: 'ERROR',
    retryable: false,
  },

  // --- UserInfo Module Errors ---
  'EmployeeNoAlreadyExist': {
    description: "El ID de empleado (employeeNo) ya existe en el dispositivo.",
    debugSuggestion: "No reintentar. Tratar como un conflicto de datos y manejarlo en la lógica de negocio (ej. pasar de 'crear' a 'actualizar').",
    severity: 'INFO', // Is an expected business case, not a system error
    retryable: false,
  },
  'UserInfoError': {
    description: "Error genérico relacionado con la gestión de información de usuario.",
    debugSuggestion: "Verificar que el formato del payload para `UserInfo/SetUp` es correcto según el manual.",
    severity: 'ERROR',
    retryable: false,
  },

  // --- Custom SDK Errors ---
  'ConnectionError': {
    description: "No se pudo establecer conexión con el dispositivo (timeout, host inalcanzable).",
    debugSuggestion: "Verificar la dirección IP, el puerto y la conectividad de red. El dispositivo puede estar offline.",
    severity: 'WARN',
    retryable: true,
  }
};

/**
 * Translates a Hikvision ISAPI error into a readable and actionable object.
 * @param error The error object, which could be an AxiosError or another exception.
 * @param deviceId The ID of the device for logging context.
 * @returns A structured error object.
 */
export function translateHikvisionError(error: any, deviceId: string): HikvisionErrorDetails & { rawError: string, deviceId: string } {
  let errorKey = 'DeviceError'; // Default error
  let rawErrorMessage = error.message;

  if (error.isAxiosError) {
    const responseData = error.response?.data;
    if (responseData && responseData.statusString) {
      errorKey = responseData.statusString;
      rawErrorMessage = `Status: ${responseData.statusCode}, SubStatus: ${responseData.subStatusCode}, Message: ${responseData.statusString}`;
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorKey = 'ConnectionError';
    }
  }

  const details = hikvisionErrorMap[errorKey] || hikvisionErrorMap['DeviceError'];

  return {
    ...details,
    rawError: rawErrorMessage,
    deviceId: deviceId,
  };
}

