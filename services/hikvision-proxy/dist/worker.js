"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeSyncWorker = void 0;
exports.startWorker = startWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const api_1 = require("@opentelemetry/api");
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const supabaseClient_1 = require("./supabaseClient");
const hikvisionErrors_1 = require("./hikvisionErrors");
const hikvision_isapi_mock_1 = require("./hikvision-isapi.mock");
const redisConnection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
const tracer = api_1.trace.getTracer('hikvision-proxy-worker');
// Create a rate limiter that allows 5 actions per second per deviceId.
const deviceLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
    storeClient: redisConnection,
    keyPrefix: 'rate-limit-device',
    points: 5, // 5 requests
    duration: 1, // per 1 second
});
/**
 * Updates the sync status of an employee in the database.
 * @param employeeId The ID of the employee.
 * @param status The new sync status.
 * @param errorDetails Optional error details if the status is 'failed'.
 */
async function updateEmployeeSyncStatus(employeeId, status, errorDetails = null) {
    const { error } = await supabaseClient_1.supabase
        .from('employees')
        .update({ sync_status: status, metadata: { ...(errorDetails ? { sync_error: errorDetails } : {}) } })
        .eq('id', employeeId);
    if (error) {
        console.error(`[Worker] CRITICAL: Failed to update sync_status for employee ${employeeId}`, error);
    }
}
/**
 * The worker that processes jobs from the 'employee-sync' queue.
 */
exports.employeeSyncWorker = new bullmq_1.Worker('employee-sync', async (job) => {
    const { employeeId, traceData } = job.data;
    // Rehydrate the trace context from the job's data
    const tracer = api_1.trace.getTracer('employee-sync-worker');
    const parentContext = traceData?.traceId ?
        api_1.propagation.extract(api_1.context.active(), traceData) : undefined;
    const ctx = parentContext ? api_1.trace.setSpan(api_1.context.active(), api_1.trace.getSpan(parentContext)) : api_1.context.active();
    return api_1.context.with(ctx, async () => {
        const span = tracer.startSpan('process-employee-sync-job', undefined, ctx);
        try {
            span.setAttributes({
                'messaging.system': 'bullmq',
                'messaging.message_id': job.id,
                'job.name': job.name,
                'job.attempts': job.attemptsMade,
            });
            // Fetch fresh employee data inside the job for idempotency
            const { data: employeeData, error: employeeError } = await supabaseClient_1.supabase
                .from('employees')
                .select('id, dni, name, company_id')
                .eq('id', employeeId)
                .single();
            if (employeeError || !employeeData) {
                throw new Error(`Could not fetch employee ${employeeId}. Error: ${employeeError?.message}`);
            }
            const companyId = employeeData.company_id;
            span.setAttributes({
                'job.company_id': companyId,
                'job.employee_dni': employeeData.dni,
            });
            console.log(`[Worker] Processing job ${job.id} for company ${companyId}, employee DNI: ${employeeData.dni}`);
            // 1. Find all active devices for the given company
            const { data: devices, error: devicesError } = await supabaseClient_1.supabase
                .from('devices')
                .select('id, ip_address, port, username, password_encrypted, name')
                .eq('company_id', companyId)
                .eq('is_active', true);
            if (devicesError) {
                throw new Error(`Could not fetch devices for company ${companyId}. Error: ${devicesError.message}`);
            }
            if (!devices || devices.length === 0) {
                console.log(`[Worker] No active devices found for company ${companyId}. Job ${job.id} will be marked as complete.`);
                return { success: true, message: 'No active devices to sync to.' };
            }
            console.log(`[Worker] Found ${devices.length} devices for company ${companyId}. Starting sync for employee ${employeeData.name}.`);
            // 2. Iterate and sync to each device
            const syncPromises = devices.map(async (device) => {
                try {
                    await deviceLimiter.consume(device.id);
                    console.log(`[Worker] -> Syncing to device: ${device.name} (${device.ip_address})`);
                    const decryptedPassword = `decrypted-${device.password_encrypted}`;
                    const hikvisionClient = new hikvision_isapi_mock_1.HikvisionISAPI({
                        host: device.ip_address,
                        port: device.port,
                        user: device.username,
                        pass: decryptedPassword,
                    });
                    await hikvisionClient.UserInfo.addOrUpdate({
                        employeeNo: employeeData.dni,
                        name: employeeData.name,
                    });
                    console.log(`[Worker] -> Successfully synced to device ${device.name}`);
                    return { deviceId: device.id, success: true };
                }
                catch (error) {
                    const readableError = (0, hikvisionErrors_1.translateHikvisionError)(error, device.id);
                    console.error(`[Worker] -> FAILED to sync to device ${device.name}. Reason: ${readableError}`);
                    if (error?.name === 'RateLimiterRes') {
                        console.warn(`[Worker] -> Rate limit exceeded for device ${device.name}. Job will be retried.`);
                        throw error;
                    }
                    return { deviceId: device.id, success: false, error: readableError };
                }
            });
            const results = await Promise.all(syncPromises);
            const failedDevices = results.filter(r => !r.success);
            if (failedDevices.length > 0) {
                const errorInfo = {
                    message: `Failed to sync to ${failedDevices.length}/${devices.length} devices.`,
                    failedDevices: failedDevices.map(d => ({ id: d.deviceId, error: d.error })),
                };
                throw new Error(JSON.stringify(errorInfo));
            }
            await updateEmployeeSyncStatus(employeeData.id, 'synced');
            console.log(`[Worker] Successfully synced employee ${employeeData.dni} to all devices. Job complete.`);
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            span.end();
            return { success: true, results };
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error.message });
            span.end();
            throw error;
        }
    });
}, {
    connection: redisConnection,
    concurrency: 10,
});
exports.employeeSyncWorker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});
exports.employeeSyncWorker.on('failed', async (job, err) => {
    console.error(`[Worker] Job ${job?.id} has FAILED DEFINITIVELY with error: ${err.message}`);
    if (job?.data.employeeId) {
        await updateEmployeeSyncStatus(job.data.employeeId, 'failed', { error: err.message, jobId: job.id });
    }
});
function startWorker() {
    console.log('[Worker] Employee sync worker started.');
}
