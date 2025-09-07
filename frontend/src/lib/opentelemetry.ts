// lib/opentelemetry.ts
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Context } from '@opentelemetry/api';

// Import span types
import type { Span } from '@opentelemetry/sdk-trace-base';

// Interface to extend span with our custom property
interface ExtendedSpan extends Span {
  _originalName?: string;
}

// Simple function to check if a span should be excluded
function shouldExcludeSpan(spanName: string): boolean {
  // List of Next.js internal span names to exclude (exact matches)
  const excludedSpanNames = [
    'resolve segment modules',
    'start response',
    'next-node-server.client component loading',
    'NextNodeServer.clientComponentLoading',
    'resolve page components',
    'bake',
    'build component tree',
    'executing api route (app) /favicon--route-entry'
  ];
  
  // List of patterns to exclude (wildcard matches)
  const excludedPatterns = [
    'GET (GET /favicon.ico'
  ];
  
  // Check for exact matches
  if (excludedSpanNames.some(name => spanName.includes(name))) {
    return true;
  }
  
  // Check for pattern matches
  if (excludedPatterns.some(pattern => spanName.includes(pattern))) {
    return true;
  }
  
  return false;
}

// Custom Span Processor to filter out Next.js internal spans
class NextJsInternalSpanFilterProcessor implements SpanProcessor {
  private nextSpanProcessor: SpanProcessor;

  constructor(nextSpanProcessor: SpanProcessor) {
    this.nextSpanProcessor = nextSpanProcessor;
  }

  onStart(span: Span, context: Context) {
    // Store the original span name for later checking
    (span as ExtendedSpan)._originalName = span.name;
    this.nextSpanProcessor.onStart(span, context);
  }

  onEnd(span: Span) {
    // Check if this span should be excluded
    const extendedSpan = span as ExtendedSpan;
    const spanName = span.name || extendedSpan._originalName || '';
    
    if (!shouldExcludeSpan(spanName)) {
      // Only pass to next processor if not excluded
      this.nextSpanProcessor.onEnd(span);
    }
    // If excluded, we simply don't call the next processor, effectively filtering out the span
  }

  shutdown(): Promise<void> {
    return this.nextSpanProcessor.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.nextSpanProcessor.forceFlush();
  }
}

// Check if we've already set up the diagnostics logger
const hasSetupDiagLogger = (global as unknown as Record<string, unknown>).__OTEL_DIAG_LOGGER_SETUP__;

// Enable OpenTelemetry diagnostics for debugging (only once)
if (!hasSetupDiagLogger) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  (global as unknown as Record<string, boolean>).__OTEL_DIAG_LOGGER_SETUP__ = true;
}

let tracerProvider: WebTracerProvider | null = null;
let loggerProvider: LoggerProvider | null = null;
let meterProvider: MeterProvider | null = null;
let isInitialized = false;

export function initOpenTelemetry() {
  // Check if OpenTelemetry is already initialized
  if (isInitialized) {
    console.log('OpenTelemetry already initialized, skipping...');
    return;
  }

  // Check if OpenTelemetry is enabled
  const isEnabled = process.env.NEXT_PUBLIC_OTEL_ENABLED === 'true';
  if (!isEnabled) {
    console.log('OpenTelemetry is disabled');
    isInitialized = true;
    return;
  }

  console.log('Initializing OpenTelemetry...');
  
  try {
    // Create resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || 'saas-platform-frontend',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // Create tracer provider
    tracerProvider = new WebTracerProvider({ resource });
    
    // Set up trace exporter
    const traceEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'https://otlp.nr-data.net/v1/traces';
    console.log('Trace endpoint:', traceEndpoint);
    
    // Parse trace headers
    let traceHeaders: Record<string, string> = {};
    const traceHeadersStr = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_HEADERS;
    if (traceHeadersStr) {
      console.log('Trace headers string:', traceHeadersStr);
      try {
        // Handle both key=value format and JSON format
        if (traceHeadersStr.includes('=')) {
          const [key, value] = traceHeadersStr.split('=', 2);
          traceHeaders[key.trim()] = value.trim();
        } else {
          // Try to parse as JSON
          traceHeaders = JSON.parse(traceHeadersStr);
        }
        console.log('Parsed trace headers:', traceHeaders);
      } catch (e) {
        console.error('Failed to parse trace headers:', e);
      }
    }
    
    const traceExporter = new OTLPTraceExporter({
      url: traceEndpoint,
      headers: traceHeaders,
    });
    
    // Create the batch span processor
    const batchSpanProcessor = new BatchSpanProcessor(traceExporter);
    
    // Wrap it with our custom filter processor to exclude Next.js internal spans
    const filteredSpanProcessor = new NextJsInternalSpanFilterProcessor(batchSpanProcessor);
    
    tracerProvider.addSpanProcessor(filteredSpanProcessor);
    tracerProvider.register();
    
    // Create logger provider
    loggerProvider = new LoggerProvider({ resource });
    
    // Set up log exporter
    const logEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'https://otlp.nr-data.net/v1/logs';
    const logExporter = new OTLPLogExporter({
      url: logEndpoint,
      headers: traceHeaders, // Use same headers for logs
    });
    
    loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));
    
    // Create meter provider
    meterProvider = new MeterProvider({ resource });
    
    // Set up metric exporter
    const metricEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'https://otlp.nr-data.net/v1/metrics';
    const metricExporter = new OTLPMetricExporter({
      url: metricEndpoint,
      headers: traceHeaders, // Use same headers for metrics
    });
    
    meterProvider.addMetricReader(new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000, // Export every 60 seconds
    }));
    
    // Register instrumentations
    registerInstrumentations({
      tracerProvider,
      loggerProvider,
      meterProvider,
      instrumentations: [
        // Removed auto-instrumentations since the package is not installed
      ],
    });
    
    isInitialized = true;
    console.log('OpenTelemetry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
  }
}

export function getTracer(name: string) {
  if (!tracerProvider) {
    return null;
  }
  return tracerProvider.getTracer(name);
}

export function getMeter(name: string) {
  if (!meterProvider) {
    return null;
  }
  return meterProvider.getMeter(name);
}

// Add getLogger function for logging
export function getLogger(name: string) {
  if (!loggerProvider) {
    return null;
  }
  return loggerProvider.getLogger(name);
}

// Export providers for direct access in helper functions
export { tracerProvider, loggerProvider, meterProvider };

// Add explicit tracing to fetch requests
export async function tracedFetch<T>(url: string, options: RequestInit = {}, spanName: string = 'http-request'): Promise<T> {
  if (!tracerProvider) {
    // If OpenTelemetry is not initialized, just do a regular fetch
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
  
  const tracer = getTracer('fetch-tracer');
  if (!tracer) {
    // If we can't get a tracer, do a regular fetch
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
  
  const span = tracer.startSpan(spanName);
  
  try {
    // Add attributes to span
    span.setAttribute('http.url', url);
    span.setAttribute('http.method', options.method || 'GET');
    
    const response = await fetch(url, options);
    
    // Add response attributes
    span.setAttribute('http.status_code', response.status);
    
    if (!response.ok) {
      span.setStatus({
        code: 2, // ERROR
        message: `HTTP error! status: ${response.status}`,
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    span.setStatus({
      code: 1, // OK
    });
    
    return response.json();
  } catch (error) {
    span.setStatus({
      code: 2, // ERROR
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    span.end();
  }
}