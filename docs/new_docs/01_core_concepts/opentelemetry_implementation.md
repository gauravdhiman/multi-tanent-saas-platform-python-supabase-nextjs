# OpenTelemetry Implementation Guide

This document provides a comprehensive yet concise overview of the OpenTelemetry implementation in this project, covering architecture, setup, and usage for both frontend and backend applications.

## Architecture Overview

The project uses an OpenTelemetry Collector-based architecture for observability:

```
Frontend App (HTTP/protobuf) → OpenTelemetry Collector (HTTP) → New Relic
Backend App (gRPC) → OpenTelemetry Collector (gRPC) → New Relic
```

### Key Components

1. **OpenTelemetry Collector**: Centralized service that receives telemetry data from applications and forwards it to New Relic
2. **Frontend Application**: Next.js app that sends telemetry via HTTP/protobuf to the collector
3. **Backend Application**: FastAPI app that sends telemetry via gRPC to the collector
4. **New Relic**: Observability platform that receives and displays telemetry data

### Benefits of This Architecture

- **Protocol Translation**: Collector translates between HTTP/protobuf (frontend) and gRPC (backend)
- **CORS Handling**: Collector handles cross-origin requests from browser-based applications
- **Centralized Processing**: All telemetry data is processed by a single service
- **Reduced Application Overhead**: Applications only need to send data to a local collector

## Environment Variables

### Required Variables

All environments require a New Relic license key:
```bash
NEW_RELIC_LICENSE_KEY=your-new-relic-license-key-here
```

### Backend Configuration

```bash
# OpenTelemetry Configuration
OTEL_ENABLED=true
OTEL_SERVICE_NAME=saas-platform-backend
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_TRACES_INSECURE=true
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_METRICS_INSECURE=true
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=grpc
OTEL_EXPORTER_OTLP_LOGS_INSECURE=true

# Exclude health check endpoints from tracing
OTEL_PYTHON_FASTAPI_EXCLUDED_URLS=/health,/health/ready,/health/live
```

### Frontend Configuration (Containerized)

```bash
# Frontend OpenTelemetry Configuration
NEXT_PUBLIC_OTEL_ENABLED=true
NEXT_PUBLIC_OTEL_SERVICE_NAME=saas-platform-frontend
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://localhost:4318/v1/logs
```

### Frontend Configuration (Local Development)

```bash
# Frontend OpenTelemetry Configuration
NEXT_PUBLIC_OTEL_ENABLED=true
NEXT_PUBLIC_OTEL_SERVICE_NAME=saas-platform-frontend-dev
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://127.0.0.1:4318/v1/traces
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/protobuf
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://127.0.0.1:4318/v1/metrics
NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://127.0.0.1:4318/v1/logs
```

## Backend Implementation

The backend uses manual OpenTelemetry instrumentation for better control and reliability.

### Configuration File

The OpenTelemetry setup is configured in `backend/config/opentelemetry.py`.

### Manual Setup Process

The `setup_opentelemetry()` function configures all three telemetry signals:

1. **Tracer Provider**: For distributed tracing
2. **Logger Provider**: For log collection and export
3. **Meter Provider**: For metrics collection and export

### Key Features

- **Explicit Configuration**: All providers are explicitly configured
- **Proper Log Formatting**: Logs include timestamps, logger names, and log levels
- **Error Handling**: Each provider setup includes try/catch blocks
- **Service Information**: Resource includes service name, version, and environment

### Usage in Application

1. Import and call the setup function in `main.py`:
   ```python
   from config.opentelemetry import setup_manual_opentelemetry
   setup_manual_opentelemetry()
   ```

2. Use the tracer for manual tracing:
   ```python
   from opentelemetry import trace
   tracer = trace.get_tracer(__name__)
   
   @app.get("/example")
   @tracer.start_as_current_span("example.operation")
   async def example_endpoint():
       # Your endpoint logic here
       pass
   ```

3. Use standard Python logging for logs:
   ```python
   import logging
   logging.info("This log will be exported via OpenTelemetry")
   ```

4. Use metrics:
   ```python
   from opentelemetry import metrics
   meter = metrics.get_meter(__name__)
   counter = meter.create_counter("example.counter")
   counter.add(1, {"attribute": "value"})
   ```

## Frontend Implementation

The frontend uses manual OpenTelemetry instrumentation with browser-compatible protocols.

### Configuration File

The OpenTelemetry setup is configured in `frontend/src/lib/opentelemetry.ts`.

### Manual Setup Process

The setup process configures:

1. **WebTracerProvider**: With OTLP exporter for traces
2. **Instrumentations**: For document load, user interactions, and fetch requests
3. **Resource Information**: With service name and other attributes

### Key Features

- **Browser-Compatible**: Uses HTTP/protobuf protocol
- **CORS Support**: Collector configured to allow frontend requests
- **Selective Instrumentation**: Only instruments relevant browser operations
- **Resource Information**: Includes service name and other resource attributes

### Usage in Application

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

## OpenTelemetry Collector Configuration

The collector is configured in `otel-collector-config.yml` with:

### Receivers
- **OTLP gRPC**: Listens on port 4317 for backend telemetry
- **OTLP HTTP**: Listens on port 4318 for frontend telemetry with CORS support

### Exporters
- **OTLP/New Relic**: Forwards data to New Relic using the license key

### Processors
- **Batch**: For efficient data handling

### CORS Configuration
The HTTP receiver is configured with CORS to allow requests from frontend origins:
```yaml
cors:
  allowed_origins:
    - "http://localhost:3000"
    - "http://127.0.0.1:3000"
    - "http://frontend:3000"
    - "http://frontend-dev:3000"
  allowed_headers:
    - "Content-Type"
    - "User-Agent"
    - "Authorization"
```

## Testing Your Implementation

### Backend

Test the backend OpenTelemetry implementation by accessing the test endpoint:
```bash
curl http://localhost:8000/test-otel
```

This endpoint generates traces, formatted logs, and metrics that appear in New Relic.

### Frontend

Test the frontend OpenTelemetry implementation by:
1. Running the frontend application
2. Performing actions that generate telemetry
3. Checking New Relic for the telemetry data

## Troubleshooting

### No Telemetry Data
1. **Check Environment Variables**: Ensure all required variables are set correctly
2. **Verify Collector Status**: Check that the OpenTelemetry Collector is running
3. **Check Network Connectivity**: Ensure applications can reach the collector
4. **Verify New Relic License Key**: Ensure the license key is valid

### Log Formatting Issues
1. **Check Logging Handler**: Ensure the OpenTelemetry logging handler is properly configured
2. **Verify Formatter**: Check that the formatter is set correctly on the logging handler

### CORS Errors
1. **Check Collector CORS Configuration**: Ensure the collector allows requests from your frontend origins
2. **Verify Endpoint URLs**: Ensure frontend is using the correct endpoint URLs

## Best Practices

### Backend
1. **Use Decorators**: Use `@tracer.start_as_current_span` for cleaner code
2. **Add Attributes**: Include meaningful attributes on spans for better filtering
3. **Handle Exceptions**: Record exceptions on spans for error tracking
4. **Use Standard Logging**: Use Python's standard logging module for logs

### Frontend
1. **Selective Instrumentation**: Only instrument operations that provide value
2. **Resource Attributes**: Include meaningful resource attributes
3. **Error Handling**: Handle errors gracefully in tracing code

### General
1. **Consistent Naming**: Use consistent naming conventions for services and operations
2. **Attribute Consistency**: Use consistent attribute names across services
3. **Service Correlation**: Use the same service names across traces, logs, and metrics