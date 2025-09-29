# Frontend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

# Set environment variables for build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_OTEL_ENABLED
ARG NEXT_PUBLIC_OTEL_SERVICE_NAME
ARG NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
ARG NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL
ARG NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
ARG NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT

# Set ENV variables for build time so they're available during the build process
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_OTEL_ENABLED=$NEXT_PUBLIC_OTEL_ENABLED
ENV NEXT_PUBLIC_OTEL_SERVICE_NAME=$NEXT_PUBLIC_OTEL_SERVICE_NAME
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set environment variables for runtime
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_OTEL_ENABLED=$NEXT_PUBLIC_OTEL_ENABLED
ENV NEXT_PUBLIC_OTEL_SERVICE_NAME=$NEXT_PUBLIC_OTEL_SERVICE_NAME
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_PROTOCOL
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
ENV NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=$NEXT_PUBLIC_OTEL_EXPORTER_OTLP_LOGS_ENDPOINT
ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
