"""
OpenTelemetry configuration for the application.
"""

import os
import logging
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter

# Enable OpenTelemetry debug logging
logging.getLogger('opentelemetry').setLevel(logging.DEBUG)

def parse_headers(headers_str: str) -> dict:
    """
    Parse headers string into a dictionary.
    
    Supports both "key=value" format and JSON format.
    """
    if not headers_str:
        return {}
    
    try:
        # Try JSON format first
        import json
        return json.loads(headers_str)
    except json.JSONDecodeError:
        pass
    
    try:
        # Try key=value format
        if "=" in headers_str:
            key, value = headers_str.split("=", 1)
            return {key.strip(): value.strip()}
    except Exception:
        pass
    
    # If all else fails, return empty dict
    logging.warning(f"Failed to parse headers: {headers_str}")
    return {}

def setup_opentelemetry(app_name: str = "saas-platform"):
    """
    Set up OpenTelemetry tracing, logging, and metrics instrumentation.
    
    Args:
        app_name: Name of the application for telemetry
    """
    logging.info("Setting up OpenTelemetry")
    
    # Log environment variables for debugging
    logging.info(f"OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: {os.getenv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT')}")
    logging.info(f"OTEL_EXPORTER_OTLP_TRACES_HEADERS: {os.getenv('OTEL_EXPORTER_OTLP_TRACES_HEADERS')}")
    logging.info(f"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: {os.getenv('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT')}")
    logging.info(f"OTEL_EXPORTER_OTLP_METRICS_HEADERS: {os.getenv('OTEL_EXPORTER_OTLP_METRICS_HEADERS')}")
    logging.info(f"OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: {os.getenv('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT')}")
    logging.info(f"OTEL_EXPORTER_OTLP_LOGS_HEADERS: {os.getenv('OTEL_EXPORTER_OTLP_LOGS_HEADERS')}")
    
    # Create a resource to represent the service
    resource = Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", app_name),
        "service.version": os.getenv("OTEL_SERVICE_VERSION", "1.0.0"),
        "environment": os.getenv("OTEL_ENVIRONMENT", "development")
    })
    
    # Set up tracing
    tracer_provider = TracerProvider(resource=resource)
    
    # Set up logging
    logger_provider = LoggerProvider(resource=resource)
    set_logger_provider(logger_provider)
    
    # Set up metrics
    try:
        # Get metrics endpoint and headers
        metrics_endpoint = os.getenv("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT", "https://otlp.nr-data.net/v1/metrics")
        metrics_headers_str = os.getenv("OTEL_EXPORTER_OTLP_METRICS_HEADERS", "")
        metrics_headers = parse_headers(metrics_headers_str)
        
        logging.info(f"Setting up metrics exporter with endpoint: {metrics_endpoint}")
        logging.info(f"Metrics headers: {metrics_headers}")
        
        otlp_metric_exporter = OTLPMetricExporter(
            endpoint=metrics_endpoint,
            headers=metrics_headers,
            timeout=10
        )
        metric_reader = PeriodicExportingMetricReader(otlp_metric_exporter)
        meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(meter_provider)
        logging.info("Metrics exporter set up successfully")
    except Exception as e:
        logging.error(f"Failed to set up metrics: {e}")
        logging.exception(e)
    
    # Set up OTLP exporters if endpoint is configured
    traces_endpoint = os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
    if traces_endpoint:
        logging.info(f"Setting up OTLP trace exporter with endpoint: {traces_endpoint}")
        
        # Get trace headers
        headers_str = os.getenv("OTEL_EXPORTER_OTLP_TRACES_HEADERS", "")
        logging.info(f"OTLP Trace Headers string: {headers_str}")
        
        headers = parse_headers(headers_str)
        logging.info(f"Parsed OTLP Trace Headers: {headers}")
        
        try:
            # Set up trace exporter
            logging.info("Setting up trace exporter")
            otlp_trace_exporter = OTLPSpanExporter(
                endpoint=traces_endpoint,
                headers=headers,
                timeout=10
            )
            tracer_provider.add_span_processor(BatchSpanProcessor(otlp_trace_exporter))
            logging.info("Trace exporter set up successfully")
        except Exception as e:
            logging.error(f"Failed to set up trace exporter: {e}")
            logging.exception(e)
        
        try:
            # Set up log exporter
            logging.info("Setting up log exporter")
            logs_endpoint = os.getenv("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", "https://otlp.nr-data.net/v1/logs")
            logs_headers_str = os.getenv("OTEL_EXPORTER_OTLP_LOGS_HEADERS", "")
            logs_headers = parse_headers(logs_headers_str)
            
            logging.info(f"Log endpoint: {logs_endpoint}")
            logging.info(f"Log headers: {logs_headers}")
            
            otlp_log_exporter = OTLPLogExporter(
                endpoint=logs_endpoint,
                headers=logs_headers,
                timeout=10
            )
            logger_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))
            logging.info("Log exporter set up successfully")
        except Exception as e:
            logging.error(f"Failed to set up log exporter: {e}")
            logging.exception(e)
    
    # Set the global providers
    trace.set_tracer_provider(tracer_provider)
    set_logger_provider(logger_provider)
    
    # Enable instrumentation
    try:
        LoggingInstrumentor().instrument(set_logging_format=True)
    except Exception as e:
        logging.error(f"Failed to instrument logging: {e}")
        logging.exception(e)
    
    logging.info("OpenTelemetry setup complete")
    return tracer_provider, logger_provider, metrics.get_meter_provider()

def instrument_fastapi(app):
    """
    Instrument a FastAPI application with OpenTelemetry.
    
    Args:
        app: FastAPI application instance
    """
    try:
        # Define URLs to exclude from instrumentation (health check endpoints)
        excluded_urls = "/health,/health/ready,/health/live"
        FastAPIInstrumentor.instrument_app(app, excluded_urls=excluded_urls)
        RequestsInstrumentor().instrument()
    except Exception as e:
        logging.error(f"Failed to instrument FastAPI app: {e}")
        logging.exception(e)

# Global providers
tracer_provider = None
logger_provider = None
meter_provider = None