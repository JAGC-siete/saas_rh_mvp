// services/hikvision-proxy/src/tracing.ts
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  // Configure the OTLP exporter to send traces to an OTel collector.
  // The endpoint should be configured via environment variables.
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  // Automatically instrument popular libraries (Express, http, Redis, etc.)
  instrumentations: [getNodeAutoInstrumentations()],
  spanProcessors: [new SimpleSpanProcessor(new OTLPTraceExporter())],
});

export const startTracing = () => {
  try {
    sdk.start();
    console.log('[Tracing] OpenTelemetry SDK started successfully.');
  } catch (error) {
    console.error('[Tracing] Error starting OpenTelemetry SDK:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[Tracing] SDK shut down successfully.'))
    .catch((error) => console.error('[Tracing] Error shutting down SDK:', error))
    .finally(() => process.exit(0));
});

