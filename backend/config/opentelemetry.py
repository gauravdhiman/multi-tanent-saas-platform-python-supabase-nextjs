"""
OpenTelemetry configuration for the application.
This module provides helper functions for manual instrumentation
when not using auto-instrumentation.

This implementation uses manual OpenTelemetry setup instead of auto-instrumentation
for better control, reliability, and performance. All three telemetry signals
(traces, logs, and metrics) are configured explicitly.

For more information about the manual setup approach, see:
docs/OPENTELEMETRY_MANUAL_SETUP.md
"""

import os
import logging
from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from config import settings

logging_level = logging.INFO

# Enable OpenTelemetry debug logging
logging.getLogger('opentelemetry').setLevel(logging_level)

def get_resource(app_name: str = "saas-platform"):
    """
    Create a resource to represent the service.
    
    Args:
        app_name: Name of the application for telemetry
    """
    return Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", app_name),
        "service.version": os.getenv("OTEL_SERVICE_VERSION", "1.0.0"),
        "environment": os.getenv("OTEL_ENVIRONMENT", "development")
    })

def setup_opentelemetry():
    """
    Sets up OpenTelemetry tracing, logging, and metrics providers manually.
    
    This function should be called once at application startup to configure
    all OpenTelemetry components without relying on auto-instrumentation.
    
    The manual setup provides:
    - Better control over configuration
    - More reliable behavior across environments
    - Better performance than auto-instrumentation
    - Easier debugging and troubleshooting
    
    For detailed information about the manual setup approach, see:
    docs/OPENTELEMETRY_MANUAL_SETUP.md
    """
    if settings.otel_enabled:
        resource = Resource.create({
            "service.name": settings.otel_service_name,
            "service.version": "1.0.0",
            "environment": settings.environment
        })

        # --- Configure the TracerProvider for Traces ---
        try:
            tracer_provider = TracerProvider(resource=resource)
            span_exporter = OTLPSpanExporter(insecure=settings.otel_exporter_otlp_traces_insecure)
            span_processor = BatchSpanProcessor(span_exporter)
            tracer_provider.add_span_processor(span_processor)
            trace.set_tracer_provider(tracer_provider)
            logging.info("Explicitly configured OpenTelemetry Tracer provider.")
            print("Explicitly configured OpenTelemetry Tracer provider.")  # Print to stdout for visibility
        except Exception as e:
            logging.error(f"Error setting up OpenTelemetry Tracer provider: {e}")
            print(f"Error setting up OpenTelemetry Tracer provider: {e}")  # Print to stdout for visibility

        # --- Configure the LoggerProvider for Logs ---
        try:
            log_exporter = OTLPLogExporter(insecure=settings.otel_exporter_otlp_logs_insecure)
            logger_provider = LoggerProvider(resource=resource)
            logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
            set_logger_provider(logger_provider)
            
            # Attach the OpenTelemetry handler to the root logger of Python's logging module.
            # This ensures that any logs created with logging.info(), logging.error(), etc.
            # are captured and exported by OpenTelemetry.
            handler = LoggingHandler(level=logging_level, logger_provider=logger_provider)
            
            # Set the formatter for the OpenTelemetry handler to match our desired format
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            
            logging.getLogger().addHandler(handler)
            logging.info("Explicitly configured OpenTelemetry Logger provider.")
            print("Explicitly configured OpenTelemetry Logger provider.")  # Print to stdout for visibility
        except Exception as e:
            logging.error(f"Error setting up OpenTelemetry Logger provider: {e}")
            print(f"Error setting up OpenTelemetry Logger provider: {e}")  # Print to stdout for visibility

        # --- Configure the MeterProvider for Metrics ---
        try:
            metric_exporter = OTLPMetricExporter(insecure=settings.otel_exporter_otlp_metrics_insecure)
            metric_reader = PeriodicExportingMetricReader(metric_exporter)
            meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
            metrics.set_meter_provider(meter_provider)
            logging.info("Explicitly configured OpenTelemetry Meter provider.")
            print("Explicitly configured OpenTelemetry Meter provider.")  # Print to stdout for visibility
        except Exception as e:
            logging.error(f"Error setting up OpenTelemetry Meter provider: {e}")
            print(f"Error setting up OpenTelemetry Meter provider: {e}")  # Print to stdout for visibility

        logging.info("OpenTelemetry setup completed.")
        print("OpenTelemetry setup completed.")  # Print to stdout for visibility

def setup_manual_opentelemetry(app_name: str = "saas-platform"):
    """
    Set up OpenTelemetry tracing, logging, and metrics instrumentation manually.
    This is the main setup function that should be used instead of auto-instrumentation.
    
    Args:
        app_name: Name of the application for telemetry
        
    This function represents the entry point for manual OpenTelemetry configuration.
    It replaces the need for the opentelemetry-instrument command and provides
    more predictable and controllable instrumentation.
    
    For detailed information about the manual setup approach, see:
    docs/OPENTELEMETRY_MANUAL_SETUP.md
    """
    logging.info("Setting up manual OpenTelemetry")
    
    # This function now just calls the main setup function
    setup_opentelemetry()
    
    logging.info("Manual OpenTelemetry setup complete")

def instrument_fastapi(app):
    """
    Instrument a FastAPI application with OpenTelemetry.
    This should only be used when not using auto-instrumentation.
    
    Args:
        app: FastAPI application instance
        
    Note: This function is kept for reference but should not be used when 
    auto-instrumentation is enabled as it will cause conflicts.
    """
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        
        # Define URLs to exclude from instrumentation (health check endpoints)
        excluded_urls = "/health,/health/ready,/health/live"
        FastAPIInstrumentor.instrument_app(app, excluded_urls=excluded_urls)
        RequestsInstrumentor().instrument()
        logging.info("Manual FastAPI instrumentation completed")
    except Exception as e:
        logging.error(f"Failed to manually instrument FastAPI app: {e}")
        logging.exception(e)

# Add a function to manually emit logs for testing
def emit_log(message: str, level: str = "INFO", attributes: dict = None):
    """
    Emit a log message. When using auto-instrumentation, this will use
    the standard Python logging which should be captured by the 
    OpenTelemetry logging instrumentation.
    
    Args:
        message: Log message
        level: Log level (INFO, ERROR, DEBUG, etc.)
        attributes: Additional attributes to include with the log
    """
    # When using auto-instrumentation, we can just use standard Python logging
    # The OpenTelemetry logging instrumentation should capture these
    logging.info(f"Log emitted: [{level}] {message}")

# Add a function to manually emit metrics for testing
def emit_metric(name: str, value: float, attributes: dict = None):
    """
    Emit a metric through OpenTelemetry.
    
    Args:
        name: Metric name
        value: Metric value
        attributes: Additional attributes to include with the metric
    """
    try:
        # Get the meter provider (should be set up by auto-instrumentation)
        meter = metrics.get_meter("backend-test")
        counter = meter.create_counter(name, description=f"Manual metric: {name}")
        counter.add(value, attributes or {})
        logging.info(f"Metric emitted: {name} = {value}")
    except Exception as e:
        logging.error(f"Failed to emit metric: {e}")

# Global providers
tracer_provider = None
logger_provider = None
meter_provider = None