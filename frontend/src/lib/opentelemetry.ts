// lib/opentelemetry.ts
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';

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

// Add lazy initialization functions
export function ensureOpentelemetryIsInitialized(): boolean {
  if (!isInitialized) {
    initOpenTelemetry();
  }
  return isInitialized;
}

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
    
    // Set up trace exporter to send to OTel Collector
    // For browser-based frontend, we need to use localhost instead of docker internal hostname
    const traceEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.replace('otel-collector', 'localhost') || 'http://localhost:4318/v1/traces';
    console.log('Trace endpoint:', traceEndpoint);
    
    const traceExporter = new OTLPTraceExporter({
      url: traceEndpoint,
      // Add error handling for the exporter
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add event listeners to the exporter to catch errors
    // Note: OTLP exporters don't have direct event listeners, but we can wrap the export method
    const originalExport = traceExporter.export.bind(traceExporter);
    traceExporter.export = function(spans, resultCallback) {
      console.log('Attempting to export traces:', spans.length);
      console.log('Trace endpoint being used:', traceEndpoint);
      
      // Filter out spans that should be excluded
      const filteredSpans = spans.filter(span => {
        // For ReadableSpan objects, we need to check the name property
        const spanName = 'name' in span ? (span as { name: string }).name : 'Unknown Span';
        const shouldExclude = shouldExcludeSpan(spanName);
        if (shouldExclude) {
          console.log('Excluding trace span:', spanName);
        }
        return !shouldExclude;
      });
      
      console.log('Filtered trace spans to export:', filteredSpans.length);
      
      // Call the original export method
      originalExport(filteredSpans, (result) => {
        console.log('Trace export result:', result);
        if (result.code !== 0) {
          console.error('Trace export failed with error:', result.error);
        } else {
          console.log('Trace export successful');
        }
        // Call the original callback
        resultCallback(result);
      });
    };
    
    // Create the batch span processor with more aggressive flushing
    const batchSpanProcessor = new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000, // Flush every 5 seconds
      exportTimeoutMillis: 30000,
    });
    
    // Add event listeners to the batch span processor
    // We can't directly add event listeners, but we can override methods
    const originalOnStart = batchSpanProcessor.onStart.bind(batchSpanProcessor);
    batchSpanProcessor.onStart = function(span, parentContext) {
      console.log('Span started:', span.name);
      originalOnStart(span, parentContext);
    };
    
    const originalOnEnd = batchSpanProcessor.onEnd.bind(batchSpanProcessor);
    batchSpanProcessor.onEnd = function(span) {
      console.log('Span ended:', span.name);
      originalOnEnd(span);
    };
    
    // Add the batch span processor directly without custom filtering
    // We'll handle filtering at the exporter level or use environment variables
    tracerProvider.addSpanProcessor(batchSpanProcessor);
    
    tracerProvider.register();
    
    // Create logger provider
    loggerProvider = new LoggerProvider({ resource });
    
    // Set up log exporter to send to OTel Collector
    // For browser-based frontend, we need to use localhost instead of docker internal hostname
    const logEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT?.replace('otel-collector', 'localhost') || 'http://localhost:4318/v1/logs';
    console.log('Log endpoint:', logEndpoint);
    const logExporter = new OTLPLogExporter({
      url: logEndpoint,
    });
    
    // Add debugging to log exporter
    const originalLogExport = logExporter.export.bind(logExporter);
    logExporter.export = function(logRecords, resultCallback) {
      console.log('Attempting to export logs:', logRecords.length);
      console.log('Log endpoint being used:', logEndpoint);
      
      originalLogExport(logRecords, (result) => {
        console.log('Log export result:', result);
        if (result.code !== 0) {
          console.error('Log export failed with error:', result.error);
        } else {
          console.log('Log export successful');
        }
        resultCallback(result);
      });
    };
    
    loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));
    
    // Create meter provider
    meterProvider = new MeterProvider({ resource });
    
    // Set up metric exporter to send to OTel Collector
    // For browser-based frontend, we need to use localhost instead of docker internal hostname
    const metricEndpoint = process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?.replace('otel-collector', 'localhost') || 'http://localhost:4318/v1/metrics';
    console.log('Metric endpoint:', metricEndpoint);
    const metricExporter = new OTLPMetricExporter({
      url: metricEndpoint,
    });
    
    // Add debugging to metric exporter
    const originalMetricExport = metricExporter.export.bind(metricExporter);
    metricExporter.export = function(metrics, resultCallback) {
      console.log('Attempting to export metrics:', metrics);
      console.log('Metric endpoint being used:', metricEndpoint);
      
      originalMetricExport(metrics, (result) => {
        console.log('Metric export result:', result);
        if (result.code !== 0) {
          console.error('Metric export failed with error:', result.error);
        } else {
          console.log('Metric export successful');
        }
        resultCallback(result);
      });
    };
    
    meterProvider.addMetricReader(new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30000, // Export every 30 seconds (reduced from 60 seconds)
    }));
    
    isInitialized = true;
    console.log('OpenTelemetry initialized successfully');
    
    // Let's also create a simple test log and metric to verify export
    setTimeout(() => {
      if (loggerProvider) {
        const logger = loggerProvider.getLogger('frontend-test');
        logger.emit({
          severityText: 'INFO',
          body: 'Frontend OpenTelemetry initialized successfully',
          timestamp: new Date().getTime(),
        });
        console.log('Test log emitted');
      }
      
      if (meterProvider) {
        const meter = meterProvider.getMeter('frontend-test');
        const counter = meter.createCounter('frontend.init.counter', {
          description: 'Count of frontend initializations',
        });
        counter.add(1, { 'service': 'saas-platform-frontend' });
        console.log('Test metric emitted');
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
  }
}

export function getTracer(name: string) {
  ensureOpentelemetryIsInitialized();
  if (!tracerProvider) {
    console.warn('Tracer provider not available');
    return null;
  }
  return tracerProvider.getTracer(name);
}

export function getMeter(name: string) {
  ensureOpentelemetryIsInitialized();
  if (!meterProvider) {
    console.warn('Meter provider not available');
    return null;
  }
  return meterProvider.getMeter(name);
}

// Add getLogger function for logging
export function getLogger(name: string) {
  ensureOpentelemetryIsInitialized();
  if (!loggerProvider) {
    console.warn('Logger provider not available');
    return null;
  }
  return loggerProvider.getLogger(name);
}

// Export providers for direct access in helper functions
export { tracerProvider, loggerProvider, meterProvider };

// Update tracedFetch to use lazy initialization
export async function tracedFetch<T>(url: string, options: RequestInit = {}, spanName: string = 'http-request'): Promise<T> {
  ensureOpentelemetryIsInitialized();
  
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

// Update emitLog to use lazy initialization
export function emitLog(message: string, level: string = 'INFO') {
  ensureOpentelemetryIsInitialized();
  
  if (!loggerProvider) {
    console.log('Logger provider not initialized, falling back to console');
    console.log(`[${level}] ${message}`);
    return;
  }
  
  const logger = loggerProvider.getLogger('manual-logger');
  logger.emit({
    severityText: level,
    body: message,
    timestamp: new Date().getTime(),
  });
  console.log(`Log emitted: [${level}] ${message}`);
}

// Update emitMetric to use lazy initialization
export function emitMetric(name: string, value: number, attributes: Record<string, string> = {}) {
  ensureOpentelemetryIsInitialized();
  
  if (!meterProvider) {
    console.log('Meter provider not initialized, skipping metric emission');
    return;
  }
  
  const meter = meterProvider.getMeter('manual-meter');
  const counter = meter.createCounter(name, {
    description: `Manual metric: ${name}`,
  });
  counter.add(value, attributes);
  console.log(`Metric emitted: ${name} = ${value}`, attributes);
}