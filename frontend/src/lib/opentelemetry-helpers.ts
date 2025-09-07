// lib/opentelemetry-helpers.ts
import { trace, context, SpanStatusCode, Attributes } from '@opentelemetry/api';
import { getTracer, getLogger } from '@/lib/opentelemetry';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { SignUpData, SignInData } from '@/lib/supabase';
import { AuthError, Provider } from '@supabase/supabase-js';

// Get tracer and logger for this module
const tracer = getTracer('opentelemetry-helpers');
const logger = getLogger('opentelemetry-helpers');

// Type definitions
type TelemetryOptions = {
  name?: string;
  attributes?: Attributes;
};

type LogOptions = {
  operation: string;
  attributes?: Attributes;
};

type Counter = {
  add: (value: number, attributes?: Attributes) => void;
};

// Helper function to record metrics
export function recordMetric(counter: Counter | null | undefined, value: number, attributes?: Attributes) {
  if (counter) {
    try {
      counter.add(value, attributes);
    } catch (error) {
      console.warn('Failed to record metric:', error);
    }
  }
}

// Helper function to log info messages
export function logInfo(message: string, attributes?: Attributes) {
  if (logger) {
    try {
      logger.emit({
        severityNumber: SeverityNumber.INFO,
        severityText: 'INFO',
        body: message,
        attributes: attributes,
      });
    } catch (error) {
      console.warn('Failed to log info message:', error);
    }
  } else {
    console.info(message, attributes);
  }
}

// Helper function to log error messages
export function logError(message: string, attributes?: Attributes) {
  if (logger) {
    try {
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: 'ERROR',
        body: message,
        attributes: attributes,
      });
    } catch (error) {
      console.warn('Failed to log error message:', error);
    }
  } else {
    console.error(message, attributes);
  }
}

// Helper function to log warnings
export function logWarning(message: string, attributes?: Attributes) {
  if (logger) {
    try {
      logger.emit({
        severityNumber: SeverityNumber.WARN,
        severityText: 'WARN',
        body: message,
        attributes: attributes,
      });
    } catch (error) {
      console.warn('Failed to log warning message:', error);
    }
  } else {
    console.warn(message, attributes);
  }
}

// Specific function types for auth operations
type SignUpFunction = (data: SignUpData) => Promise<{ error: AuthError | null }>;
type SignInFunction = (data: SignInData) => Promise<{ error: AuthError | null }>;
type SignInWithOAuthFunction = (provider: Provider) => Promise<{ error: AuthError | null }>;
type SignOutFunction = () => Promise<{ error: AuthError | null }>;

// Main telemetry wrapper functions for specific auth operations
export function withTelemetrySignUp(
  fn: SignUpFunction,
  telemetryOptions: TelemetryOptions = {},
  logOptions: LogOptions = { operation: 'operation' }
): SignUpFunction {
  return async function (data: SignUpData) {
    // If tracer is not available, just execute the function
    if (!tracer) {
      logInfo(`Executing ${logOptions.operation} without telemetry`, logOptions.attributes);
      return fn(data);
    }

    // Create span name
    const spanName = telemetryOptions.name || fn.name || 'anonymous-function';

    // Start span
    const span = tracer.startSpan(spanName, {
      attributes: telemetryOptions.attributes,
    });

    // Set span in context
    const ctx = trace.setSpan(context.active(), span);

    try {
      // Log the operation start
      logInfo(`Starting ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'started',
      });

      // Execute function in context
      const result = await context.with(ctx, fn, undefined, data);

      // Set span status to OK
      span.setStatus({ code: SpanStatusCode.OK });

      // Log the operation success
      logInfo(`Completed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'completed',
      });

      return result;
    } catch (error) {
      // Set span status to ERROR
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });

      // Record the exception
      span.recordException(error instanceof Error ? error : new Error(String(error)));

      // Log the error
      logError(`Failed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'failed',
        'error.message': error instanceof Error ? error.message : String(error),
        'error.name': error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    } finally {
      // End the span
      span.end();
    }
  };
}

export function withTelemetrySignIn(
  fn: SignInFunction,
  telemetryOptions: TelemetryOptions = {},
  logOptions: LogOptions = { operation: 'operation' }
): SignInFunction {
  return async function (data: SignInData) {
    // If tracer is not available, just execute the function
    if (!tracer) {
      logInfo(`Executing ${logOptions.operation} without telemetry`, logOptions.attributes);
      return fn(data);
    }

    // Create span name
    const spanName = telemetryOptions.name || fn.name || 'anonymous-function';

    // Start span
    const span = tracer.startSpan(spanName, {
      attributes: telemetryOptions.attributes,
    });

    // Set span in context
    const ctx = trace.setSpan(context.active(), span);

    try {
      // Log the operation start
      logInfo(`Starting ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'started',
      });

      // Execute function in context
      const result = await context.with(ctx, fn, undefined, data);

      // Set span status to OK
      span.setStatus({ code: SpanStatusCode.OK });

      // Log the operation success
      logInfo(`Completed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'completed',
      });

      return result;
    } catch (error) {
      // Set span status to ERROR
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });

      // Record the exception
      span.recordException(error instanceof Error ? error : new Error(String(error)));

      // Log the error
      logError(`Failed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'failed',
        'error.message': error instanceof Error ? error.message : String(error),
        'error.name': error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    } finally {
      // End the span
      span.end();
    }
  };
}

export function withTelemetrySignInWithOAuth(
  fn: SignInWithOAuthFunction,
  telemetryOptions: TelemetryOptions = {},
  logOptions: LogOptions = { operation: 'operation' }
): SignInWithOAuthFunction {
  return async function (provider: Provider) {
    // If tracer is not available, just execute the function
    if (!tracer) {
      logInfo(`Executing ${logOptions.operation} without telemetry`, logOptions.attributes);
      return fn(provider);
    }

    // Create span name
    const spanName = telemetryOptions.name || fn.name || 'anonymous-function';

    // Start span
    const span = tracer.startSpan(spanName, {
      attributes: telemetryOptions.attributes,
    });

    // Set span in context
    const ctx = trace.setSpan(context.active(), span);

    try {
      // Log the operation start
      logInfo(`Starting ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'started',
      });

      // Execute function in context
      const result = await context.with(ctx, fn, undefined, provider);

      // Set span status to OK
      span.setStatus({ code: SpanStatusCode.OK });

      // Log the operation success
      logInfo(`Completed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'completed',
      });

      return result;
    } catch (error) {
      // Set span status to ERROR
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });

      // Record the exception
      span.recordException(error instanceof Error ? error : new Error(String(error)));

      // Log the error
      logError(`Failed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'failed',
        'error.message': error instanceof Error ? error.message : String(error),
        'error.name': error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    } finally {
      // End the span
      span.end();
    }
  };
}

export function withTelemetrySignOut(
  fn: SignOutFunction,
  telemetryOptions: TelemetryOptions = {},
  logOptions: LogOptions = { operation: 'operation' }
): SignOutFunction {
  return async function () {
    // If tracer is not available, just execute the function
    if (!tracer) {
      logInfo(`Executing ${logOptions.operation} without telemetry`, logOptions.attributes);
      return fn();
    }

    // Create span name
    const spanName = telemetryOptions.name || fn.name || 'anonymous-function';

    // Start span
    const span = tracer.startSpan(spanName, {
      attributes: telemetryOptions.attributes,
    });

    // Set span in context
    const ctx = trace.setSpan(context.active(), span);

    try {
      // Log the operation start
      logInfo(`Starting ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'started',
      });

      // Execute function in context
      const result = await context.with(ctx, fn, undefined);

      // Set span status to OK
      span.setStatus({ code: SpanStatusCode.OK });

      // Log the operation success
      logInfo(`Completed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'completed',
      });

      return result;
    } catch (error) {
      // Set span status to ERROR
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });

      // Record the exception
      span.recordException(error instanceof Error ? error : new Error(String(error)));

      // Log the error
      logError(`Failed ${logOptions.operation}`, {
        ...logOptions.attributes,
        'operation.status': 'failed',
        'error.message': error instanceof Error ? error.message : String(error),
        'error.name': error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    } finally {
      // End the span
      span.end();
    }
  };
}