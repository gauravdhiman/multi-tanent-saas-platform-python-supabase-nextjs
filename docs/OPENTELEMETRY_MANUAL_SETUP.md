# Manual OpenTelemetry Setup

This document explains the manual OpenTelemetry implementation used in this project, which replaces the auto-instrumentation approach for better control and reliability.

## Why Manual Instrumentation?

The project moved from auto-instrumentation to manual instrumentation for several reasons:

1. **Better Control**: Manual setup provides precise control over what is instrumented and how
2. **Reliability**: Auto-instrumentation can be unpredictable and may not work consistently across environments
3. **Performance**: Manual instrumentation has less overhead than auto-instrumentation
4. **Debugging**: Easier to debug and troubleshoot issues with explicit setup
5. **Customization**: Allows for custom configurations that auto-instrumentation doesn't support

## Backend Implementation

### Configuration File

The backend OpenTelemetry setup is configured in `backend/config/opentelemetry.py`. This file contains functions to manually set up all three OpenTelemetry signals:

1. **Tracer Provider**: For distributed tracing
2. **Logger Provider**: For log collection and export
3. **Meter Provider**: For metrics collection and export

### Manual Setup Process

The setup process in `setup_opentelemetry()` function:

1. Creates a Resource with service information
2. Configures TracerProvider with OTLP exporter
3. Configures LoggerProvider with OTLP exporter
4. Configures MeterProvider with OTLP exporter
5. Adds a custom formatter to the OpenTelemetry logging handler to ensure proper log formatting

### Key Features

- **Explicit Configuration**: All providers are explicitly configured rather than relying on environment variables
- **Proper Log Formatting**: Logs include timestamps, logger names, and log levels
- **Error Handling**: Each provider setup includes try/catch blocks for graceful error handling
- **Service Information**: Resource includes service name, version, and environment

### Usage in Application

To use OpenTelemetry in your FastAPI application:

1. Import the setup function in `main.py`:
   ```python
   from config.opentelemetry import setup_manual_opentelemetry
   ```

2. Call the setup function early in application startup:
   ```python
   setup_manual_opentelemetry()
   ```

3. Use the tracer for manual tracing:
   ```python
   from opentelemetry import trace
   tracer = trace.get_tracer(__name__)
   
   @app.get("/example")
   @tracer.start_as_current_span("example.operation")
   async def example_endpoint():
       # Your endpoint logic here
       pass
   ```

4. Use standard Python logging for logs:
   ```python
   import logging
   logging.info("This log will be exported via OpenTelemetry")
   ```

5. Use metrics:
   ```python
   from opentelemetry import metrics
   meter = metrics.get_meter(__name__)
   counter = meter.create_counter("example.counter")
   counter.add(1, {"attribute": "value"})
   ```

## Frontend Implementation

### Configuration File

The frontend OpenTelemetry setup is configured in `frontend/src/lib/opentelemetry.ts`. This file contains the manual setup for browser-based telemetry collection.

### Manual Setup Process

The setup process in the frontend:

1. Creates a WebTracerProvider with OTLP exporter
2. Registers the tracer provider
3. Configures instrumentation for browser-specific operations:
   - Document load
   - User interactions
   - Fetch requests
4. Sets up resource information with service name

### Key Features

- **Browser-Compatible**: Uses HTTP/protobuf protocol for browser compatibility
- **CORS Support**: Collector configured to allow requests from frontend origins
- **Selective Instrumentation**: Only instruments relevant browser operations
- **Resource Information**: Includes service name and other resource attributes

### Usage in Application

To use OpenTelemetry in your Next.js application:

1. Import the tracer in your components:
   ```typescript
   import { trace } from '@opentelemetry/api';
   const tracer = trace.getTracer('frontend');
   ```

2. Create spans manually:
   ```typescript
   tracer.startActiveSpan('user.action', async (span) => {
     try {
       // Your operation logic here
       span.end();
     } catch (error) {
       span.recordException(error);
       span.setStatus({ code: SpanStatusCode.ERROR });
       span.end();
     }
   });
   ```

3. Use console logging for logs (automatically captured):
   ```typescript
   console.log("This log will be exported via OpenTelemetry");
   ```

## Environment Variables

### Backend

The backend uses these environment variables for OpenTelemetry configuration:

```bash
# OpenTelemetry Configuration
OTEL_ENABLED=true
OTEL_SERVICE_NAME=saas-platform-backend
# Traces
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_TRACES_INSECURE=true
# Metrics
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_METRICS_INSECURE=true
# Logs
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_LOGS_INSECURE=true

# OpenTelemetry Configuration - FastAPI Instrumentation
OTEL_PYTHON_FASTAPI_EXCLUDED_URLS=/health,/health/ready,/health/live
```

### Frontend

The frontend uses these environment variables for OpenTelemetry configuration:

```bash
# Frontend OpenTelemetry Configuration - Traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf

# Frontend OpenTelemetry Configuration - Metrics
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://127.0.0.1:4318/v1/metrics

# Frontend OpenTelemetry Configuration - Logs
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://127.0.0.1:4318/v1/logs
```

## OpenTelemetry Collector

The project uses an OpenTelemetry Collector as an intermediary between applications and New Relic:

### Benefits

1. **Protocol Translation**: Translates between gRPC (backend) and HTTP/protobuf (frontend)
2. **Centralized Processing**: All telemetry data is processed by a single service
3. **CORS Handling**: Collector handles CORS for browser-based applications
4. **Buffering and Retry**: Provides better buffering and retry mechanisms
5. **Reduced Application Overhead**: Applications only need to send data to a local collector

### Configuration

The collector is configured in `otel-collector-config.yml` with:

1. **OTLP Receivers**: Both gRPC and HTTP receivers
2. **CORS Configuration**: Allows requests from frontend origins
3. **New Relic Exporter**: Forwards data to New Relic using the license key
4. **Batch Processors**: For efficient data handling

## Testing Your Implementation

### Backend

Test the backend OpenTelemetry implementation by accessing the test endpoint:

```bash
curl http://localhost:8000/test-otel
```

This endpoint will generate:
- A trace with nested spans
- Formatted logs with timestamps
- Metrics that appear in New Relic

### Frontend

Test the frontend OpenTelemetry implementation by:

1. Running the frontend application
2. Performing actions that generate telemetry
3. Checking New Relic for the telemetry data

## Troubleshooting

### No Telemetry Data

1. **Check Environment Variables**: Ensure all required environment variables are set correctly
2. **Verify Collector Status**: Check that the OpenTelemetry Collector is running
3. **Check Network Connectivity**: Ensure applications can reach the collector
4. **Verify New Relic License Key**: Ensure the license key is valid and correctly configured

### Log Formatting Issues

1. **Check Logging Handler**: Ensure the OpenTelemetry logging handler is properly configured
2. **Verify Formatter**: Check that the formatter is set correctly on the logging handler
3. **Check Log Levels**: Ensure the logging level is set appropriately

### CORS Errors

1. **Check Collector CORS Configuration**: Ensure the collector allows requests from your frontend origins
2. **Verify Endpoint URLs**: Ensure frontend is using the correct endpoint URLs
3. **Check Network Configuration**: Ensure there are no network restrictions

## Best Practices

### Backend

1. **Use Decorators**: Use `@tracer.start_as_current_span` for cleaner code
2. **Add Attributes**: Include meaningful attributes on spans for better filtering
3. **Handle Exceptions**: Record exceptions on spans for error tracking
4. **Set Status**: Set span status to ERROR when operations fail
5. **Use Standard Logging**: Use Python's standard logging module for logs

### Frontend

1. **Selective Instrumentation**: Only instrument operations that provide value
2. **Resource Attributes**: Include meaningful resource attributes
3. **Error Handling**: Handle errors gracefully in tracing code
4. **Performance**: Be mindful of the performance impact of tracing

### General

1. **Consistent Naming**: Use consistent naming conventions for services and operations
2. **Attribute Consistency**: Use consistent attribute names across services
3. **Service Correlation**: Use the same service names across traces, logs, and metrics
4. **Security**: Never include sensitive information in telemetry data