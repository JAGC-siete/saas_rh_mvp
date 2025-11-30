// lib/tracing.ts
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// This function is called before the Next.js server starts.
export const startTracing = () => {
  const sdk = new NodeSDK({
    serviceName: 'saas-application',
    // Configure the OTLP exporter to send traces to an OTel collector.
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    }),
    // Automatically instrument popular libraries (Next.js, http, Redis, etc.)
    instrumentations: [getNodeAutoInstrumentations()],
    spanProcessors: [new SimpleSpanProcessor(new OTLPTraceExporter())],
  });

  try {
    sdk.start();
    console.log('[Tracing] OpenTelemetry SDK for SaaS started successfully.');
  } catch (error) {
    console.error('[Tracing] Error starting OpenTelemetry SDK for SaaS:', error);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('[Tracing] SaaS SDK shut down successfully.'))
      .catch((error) => console.error('[Tracing] Error shutting down SaaS SDK:', error))
      .finally(() => process.exit(0));
  });
};

