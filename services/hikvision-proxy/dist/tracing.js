"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTracing = void 0;
// services/hikvision-proxy/src/tracing.ts
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const sdk = new sdk_node_1.NodeSDK({
    // Configure the OTLP exporter to send traces to an OTel collector.
    // The endpoint should be configured via environment variables.
    traceExporter: new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    // Automatically instrument popular libraries (Express, http, Redis, etc.)
    instrumentations: [(0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()],
    spanProcessors: [new sdk_trace_base_1.SimpleSpanProcessor(new exporter_trace_otlp_http_1.OTLPTraceExporter())],
});
const startTracing = () => {
    try {
        sdk.start();
        console.log('[Tracing] OpenTelemetry SDK started successfully.');
    }
    catch (error) {
        console.error('[Tracing] Error starting OpenTelemetry SDK:', error);
        process.exit(1);
    }
};
exports.startTracing = startTracing;
// Graceful shutdown
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('[Tracing] SDK shut down successfully.'))
        .catch((error) => console.error('[Tracing] Error shutting down SDK:', error))
        .finally(() => process.exit(0));
});
