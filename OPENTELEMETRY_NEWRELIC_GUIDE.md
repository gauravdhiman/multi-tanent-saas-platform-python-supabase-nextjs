# OpenTelemetry with New Relic: Viewing Logs and Metrics

This guide explains how to view logs and metrics in New Relic that are sent via OpenTelemetry from your application.

## Prerequisites

Make sure you have:
1. Set up the OpenTelemetry configuration correctly in your `.env` file
2. Running the application with the proper environment variables
3. Valid New Relic license key

## Viewing Traces in New Relic

Traces should already be visible in New Relic under:
1. Go to **New Relic One** > **APM & Services**
2. Select your service (e.g., "saas-platform")
3. Navigate to **Distributed tracing** > **Traces**

## Viewing Logs in New Relic

### 1. Accessing Logs

1. Go to **New Relic One** > **Logs**
2. In the filter bar, search for logs from your service:
   ```
   service.name = 'saas-platform' OR service.name = 'saas-platform-frontend'
   ```

### 2. Common Log Locations

- **Backend logs**: Filter by `service.name = 'saas-platform'`
- **Frontend logs**: Filter by `service.name = 'saas-platform-frontend'`
- **Error logs**: Filter by `level = 'ERROR' OR level = 'CRITICAL'`

### 3. Structured Logging

Logs with structured data can be filtered by attributes:
- Filter by user ID: `user.id = 'some-uuid'`
- Filter by operation: `operation = 'signup'`
- Filter by error type: `error.type = 'validation'`

## Viewing Metrics in New Relic

### 1. Accessing Metrics

1. Go to **New Relic One** > **Query your data**
2. Use NRQL to query your metrics:

### 2. Common Metrics Queries

#### Authentication Metrics
```sql
-- Authentication attempts
SELECT count(*) FROM Metric WHERE metricName = 'auth.attempts' FACET operation

-- Authentication success rate
SELECT percentage(count(*), WHERE metricName = 'auth.success') FROM Metric WHERE metricName IN ('auth.success', 'auth.failures')

-- Authentication failures by error type
SELECT count(*) FROM Metric WHERE metricName = 'auth.failures' FACET error
```

#### RBAC Metrics
```sql
-- RBAC operations
SELECT count(*) FROM Metric WHERE metricName = 'rbac.operations' FACET operation

-- RBAC error rate
SELECT percentage(count(*), WHERE metricName = 'rbac.errors') FROM Metric WHERE metricName IN ('rbac.operations', 'rbac.errors')
```

#### Frontend Metrics
```sql
-- Frontend RBAC operations
SELECT count(*) FROM Metric WHERE metricName = 'rbac.operations' AND service.name = 'saas-platform-frontend' FACET operation

-- Frontend authentication attempts
SELECT count(*) FROM Metric WHERE metricName = 'auth.attempts' AND service.name = 'saas-platform-frontend' FACET operation
```

### 3. Creating Dashboards

1. Go to **New Relic One** > **Dashboards**
2. Click **Create a dashboard**
3. Add charts using the NRQL queries above

Example dashboard queries:
- Chart 1 (Line): `SELECT rate(count(*), 1 minute) FROM Metric WHERE metricName = 'auth.attempts' TIMESERIES`
- Chart 2 (Bar): `SELECT count(*) FROM Metric WHERE metricName = 'auth.failures' FACET error`
- Chart 3 (Area): `SELECT rate(count(*), 1 minute) FROM Metric WHERE metricName = 'rbac.operations' TIMESERIES FACET operation`

## Testing Your Integration

### Run the Full Integration Test

```bash
cd backend
python test_otel_full_integration.py
```

This script will generate:
- Traces with nested spans
- Logs at different severity levels
- Metrics including counters and histograms

### Verify Data in New Relic

After running the test:
1. Wait 1-2 minutes for data to appear in New Relic
2. Check **Logs** for structured log entries
3. Check **Metrics** for counters and histograms
4. Check **Distributed tracing** for trace spans

## Troubleshooting

### No Logs Appearing

1. Check your `.env` file has the correct log endpoint:
   ```
   OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://otlp.nr-data.net/v1/logs
   OTEL_EXPORTER_OTLP_LOGS_HEADERS=api-key=${NEW_RELIC_LICENSE_KEY}
   ```

2. Ensure logging level is set correctly in your application code:
   ```python
   import logging
   logging.getLogger().setLevel(logging.INFO)
   ```

### No Metrics Appearing

1. Check that metrics are being created and recorded in your code:
   ```python
   from opentelemetry import metrics
   meter = metrics.get_meter(__name__)
   counter = meter.create_counter("my.counter")
   counter.add(1, {"attribute": "value"})
   ```

2. Verify the metrics endpoint in your `.env`:
   ```
   OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otlp.nr-data.net/v1/metrics
   OTEL_EXPORTER_OTLP_METRICS_HEADERS=api-key=${NEW_RELIC_LICENSE_KEY}
   ```

### Data Appears in Traces but Not Logs/Metrics

This typically indicates that the exporters for logs and metrics are not properly configured or the endpoints are incorrect. Double-check:

1. All three endpoints are correctly set:
   - `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
   - `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`
   - `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`

2. All three header configurations are set:
   - `OTEL_EXPORTER_OTLP_TRACES_HEADERS`
   - `OTEL_EXPORTER_OTLP_METRICS_HEADERS`
   - `OTEL_EXPORTER_OTLP_LOGS_HEADERS`

## Best Practices

1. **Use descriptive metric names**: Follow a consistent naming convention like `service.operation.type`

2. **Add meaningful attributes**: Include relevant context as attributes to make filtering easier

3. **Set appropriate logging levels**: Use DEBUG, INFO, WARNING, ERROR, CRITICAL appropriately

4. **Correlate data**: Use the same service names across traces, logs, and metrics for easy correlation

5. **Monitor error rates**: Create alerts for high error rates in authentication or RBAC operations

6. **Track performance**: Monitor response times and operation counts to identify performance issues