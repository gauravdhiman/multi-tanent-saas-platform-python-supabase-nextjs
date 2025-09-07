// instrumentation.ts
// This file is used by Next.js to initialize OpenTelemetry
// It's loaded before any other code runs in the application

export async function register() {
  // Only run instrumentation in Node.js environment, not in edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // We're using our custom OpenTelemetry setup in lib/opentelemetry.ts
    // which is imported in src/app/layout.tsx
    // This file is kept minimal to avoid conflicts
    console.log('Next.js instrumentation registered');
  }
}