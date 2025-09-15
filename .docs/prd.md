

# Product Requirements Document (PRD) Table of Contents
## Overview
## Scope & Features
## Architecture & Technical Design
## Workflows & Use Cases
## Technical Requirements
## Data Isolation & Multi-Tenant Implementation Details
## Testing Strategy
## API & UI Documentation
## Deployment & Operations
## Milestones / Timeline
## Risks & Mitigation
## Quick Summary of Key Architectural Decisions
## Organization & Entities — Attributes
## Database Design — Sample DDL
## Row-Level Security (RLS) Patterns & Example Supolicies (Supabase/Postgres)
## Roles & Permissions Enforcement Rules
## API Endpoints (Representative)
## Stripe Webhooks & Idempotency Best Practices
## Observability (OpenTelemetry) — Instrumentation & Pipeline
## Security Considerations (Detailed)
## Testing Strategy — Mapping to Features
## Example Sequence Flows
## Example Access Control Checks (Pseudocode)
## CI/CD, Infra & Deployment Notes
## Observability & Monitoring Checklist
## Appendix / Notes

## 1 — Overview Purpose
Build a production-grade, multi-tenant SaaS web application that supports organizations (tenants) and includes:
- Authentication (password + OAuth Google/LinkedIn)
- User & role-based access control (RBAC)
- Subscription & credit management (Stripe)
- Email notifications (Resend or equivalent)
- Multi-tenant isolation (RLS / tenant_id / schema strategies)
- Secure, reliable, maintainable, test-first architecture that scales

### Stakeholders
- Product Owner
- Frontend Developers
- Backend Developers
- DevOps / Infrastructure Engineers
- QA / Test Engineers
- Users (Platform Admins, Tenant Admins, Organization Users)
- Payment & Finance Team

### Goals & Success Metrics
- Tenant data isolation (no cross-tenant leakage)
- User and permission flows clean & auditable
- Subscription & credit accounting correct and auditable
- Reliable notifications (email delivery & retries)
- High test coverage and code quality (TDD)
- Scalable and maintainable architecture
- Fast tenant onboarding (minimize friction)

## 2 — Scope & Features
### 2.1 Functional Features (detailed)
#### Authentication
- Password-based signup/login/reset flows.
- OAuth integration: Google and LinkedIn for signup/login.
- Email verification on signup.
- Forgot password and password reset using token link.

#### User Management
- CRUD for user profiles.
- Manage user status (active / inactive).
- Organization admins can invite users (invite email + token).

#### Organization (Tenant) Management
- Create and onboard new organizations/tenants.
- Store tenant metadata: name, domain/subdomain, settings, plan, timezone, locale, billing_contact, stripe_customer_id.
- Optional support for custom domains/subdomains for tenant routing.

#### Role & Permission Management (RBAC)
- Predefined system roles (Owner, Admin, Member, Billing) seeded on install.
- Platform-only role creation/editing: only Platform Admin can create or edit role definitions.
- Permissions mapped to actions/resources (e.g., users.create, billing.view).
- Enforcement both in frontend (guards) and backend (middleware/services + DB policies).
- One role per user per organization (enforced with DB unique constraint).

#### Subscription & Credit Management
- Stripe integration for subscriptions and payments.
- Define plan tiers with pricing, included credits, features, interval (monthly/annual).
- Credit allocation and tracking per tenant (credit_balance, credit_transactions).
- Usage-monitoring and consumption tracking.
- Lifecycle: trial, active, cancelled, past_due, expired etc.
- Webhook-driven updates from Stripe to handle lifecycle and billing events.

#### Notifications
- Transactional email delivery via Resend (or equivalent).
- Email triggers: user invited, password reset, email verification, subscription status changes, credit depletion / low-credit alerts, billing failures.
- Optional UI in-app notifications.
- Notifications delivered via event-driven approach (message queue or internal events).

#### Multi-tenancy & Isolation
- Strong separation of data per tenant.
- Use shared database + shared schema with Row-Level Security (RLS) recommended.
- Ensure users can only access their tenant rows.
- Tenant routing via domain/subdomain or X-Tenant-ID request header.

#### Security
- Secure password storage (Argon2 or bcrypt salted hashing).
- Secure tokens for resets and verification (single-use, expiration).
- Protections against XSS, CSRF, SQL injection, brute force.
- Audit logging for critical operations (login, role changes, billing).

#### Admin / Super Admin
- Platform-level Super Admin to manage tenants and platform-wide configuration.
- Tenant admins for organization-level management.

#### UI / UX
- Responsive UI with accessibility consideration (WCAG where applicable).
- Clean design using Tailwind CSS + Shadcn/ui components.

#### Reporting & Monitoring
- Dashboards showing credit usage and subscription status.
- Logs and metrics for performance, errors, and billing events.

### 2.2 Non-Functional Requirements
#### Performance
- Typical API latency goal: <200ms.
- First load UI target: <2s.

#### Scalability
- Microservices horizontally scalable.
- DB schema to support many tenants and data growth.

#### Reliability & Availability
- Tolerate partial failures.
- SLA target example: 99.9% uptime.
- Retries for transient errors.

#### Security & Data Protection
- Data encryption at rest & in transit.
- RLS for tenant isolation.
- Logging & monitoring for security events.
- Compliance readiness (GDPR) if international.

#### Maintainability
- Modular code, consistent patterns and documentation.
- Tests: unit, integration, E2E, contract tests.

#### Extensibility
- Feature flags, plugins, ability to add new roles/behaviors.

#### Observability
- Traces, logs, metrics (OpenTelemetry recommended).

## 3 — Architecture & Technical Design
### 3.1 Tech Stack (recommended)
| Layer | Technology |
|-------|------------|
| Frontend | Next.js (React) |
| Styling / UI | Tailwind CSS + Shadcn/ui |
| Backend | Python (FastAPI) microservices |
| Database | Supabase (Postgres) |
| ORM | SQLAlchemy or SQLModel |
| Auth | JWT + OAuth (Google, LinkedIn) |
| Payments | Stripe |
| Email | Resend |
| Containers | Docker (K8s for production) |
| Infra / IaC | Terraform (optional), CI/CD (GitHub Actions) |
| Testing | Pytest, Playwright/Cypress, Jest + RTL |
| Observability | OpenTelemetry, OTLP collector, metrics backend |

### 3.2 Multi-Tenancy Strategy (decision)
Selected approach: Shared database + shared schema (tenant_id column) + Row-Level Security (RLS) policies in Postgres/Supabase for strong isolation with manageable operational overhead.

Tenant identification: via domain/subdomain routing (slug) or X-Tenant-ID header (middleware resolves and injects tenant context).

Ensure tenant context is request-scoped and thread-safe.

### 3.3 Component / Service Design (summary)
| Service | Responsibilities | Key Endpoints |
|---------|-----------------|---------------|
| Auth Service | Signup, login, OAuth flows, tokens, password reset, email verification | /auth/signup, /auth/login, /auth/oauth/google, /auth/forgot-password |
| Tenant Service | Create/update tenants, metadata, domains, plan status, provisioning | /tenants, /tenants/{id}/settings |
| User Management | CRUD users, invites, membership management | /users, /orgs/{org}/members |
| RBAC Service | Roles & permissions management, permission checks | /roles, /permissions |
| Billing Service | Interact with Stripe, manage subscriptions & credits, webhooks | /subscriptions, /stripe/webhooks, /credits |
| Notifications | Send transactional emails (Resend) and manage templates | internal POST /notifications/email |
| Frontend App | Next.js UI for all flows | n/a (client app) |

Internal communication can be synchronous (HTTP) for simple actions, or asynchronous (message queue: Redis streams, RabbitMQ, or pub/sub) for decoupled events (billing processed → send notification).

### 3.4 High-Level Data Model
Key entities and relationships:

**Tenant / Organization**
- id, name, slug, domain, plan_id, stripe_customer_id, credit_balance, status (trialing, active, past_due, cancelled), metadata, created_at, updated_at.

**User**
- id, email, full_name, password_hash (nullable for OAuth users), email_verified, is_platform_admin, created_at, last_login_at.

**Membership (user ↔ org)**
- id, user_id, org_id, role_id, status (invited, active, suspended), invited_by, invited_at, joined_at.
- Unique constraint on (user_id, org_id) to ensure exactly one role per user per org.

**Role**
- id, name, description, is_platform_role, created_by, created_at.

**Permission**
- id, key (e.g., users.create), description.

**RolePermission**
- role_id, permission_id (composite PK).

**Plan**
- id, name, stripe_price_id, included_credits, features (jsonb), price, interval.

**Subscription**
- id, org_id, plan_id, stripe_subscription_id, status, start_date, end_date, cancel_at_period_end.

**CreditTransaction**
- id, org_id, amount, type (usage, topup, adjustment), reason, metadata, created_at.

**AuditLog**
- id, org_id, user_id, action_key, details (jsonb), ip, user_agent, created_at.

**Tokens**
- Email verification tokens, password reset tokens, invite tokens (transient storage with TTL).

### 3.5 Security & Access Control
- Authentication: JWT access tokens (short-lived) + refresh tokens (rotating). Consider storing refresh tokens server-side for revocation.
- Authorization: RBAC enforced in middleware (FastAPI dependencies) + DB-level RLS.
- Password storage: Argon2 preferred; otherwise bcrypt with appropriate parameters.
- Token security: single-use reset tokens with expiry; store token hashes in DB.
- Transport: HTTPS for all services, HSTS headers.
- Secrets management: Vault or cloud secret manager for keys (Stripe, Resend, OAuth secrets).
- Input validation: Pydantic models (FastAPI) to enforce schemas and sanitization.
- Rate-limiting: On sensitive endpoints (auth, password reset) and brute-force protections.
- Audit logging: For role changes, billing events, deletions, admin actions.

### 3.6 Infrastructure & Deployment
- Containerization: Docker for each service and the frontend.
- Orchestration: Docker Compose for dev; Kubernetes (Helm) for production.
- CI/CD: GitHub Actions (or GitLab CI) pipeline to run tests, build images, push to a registry, and deploy.
- Migrations: Alembic (or Supabase migrations). Test migrations against staging/test DBs.
- Backups: Daily DB backups + point-in-time recovery.
- Secrets & Env: Store via secrets manager; do not commit .env secrets.

### 3.7 API / Communication
- External APIs: REST APIs (FastAPI) with auto-generated OpenAPI specs.
- Internal communication: HTTP + optional message queue for event-based flows (billing events, notifications).
- Webhook handling: Secure webhook endpoints for Stripe (signature verification) and other providers.

## 4 — Workflows & Use Cases
### 4.1 User Signup & Onboarding
1. User visits signup page.
2. Options: password signup or OAuth (Google/LinkedIn).
3. If creating a new org, user provides organization details (name, slug).
4. System creates tenant record and provisions defaults (roles, settings).
5. Send email verification (Resend) with token.
6. After verifying, user logs in and begins onboarding.

### 4.2 User Invite & Role Assignment
1. Tenant admin invites by entering email and role.
2. System creates a membership row with status='invited' and generates invite token.
3. System sends invite email via Resend with the invite link.
4. Invitee clicks link, accepts, sets password or signs in via OAuth.
5. System links user to organization and sets status='active'.

### 4.3 Authentication
- Username/email + password → /auth/login → returns access + refresh tokens.
- OAuth flow: redirect → provider callback → retrieve user info → create/link user and memberships as needed.

### 4.4 Permissions & Role Management
- Platform Admins: define and manage roles & permissions.
- Org Admins: assign platform-defined roles to members (cannot create new role definitions).
- On each request: backend checks membership, role and permission mapping (middleware + RLS policies).

### 4.5 Subscription & Credits
1. Tenant chooses plan (onboarding or later).
2. Backend creates Stripe subscription (idempotent create with idempotency key).
3. Stripe sends webhooks (invoice.paid, invoice.payment_failed, customer.subscription.updated) → Billing service processes events and updates DB (subscription status, credit allocations).
4. Credits are added to organization credit_balance (via credit_transactions) when payment succeeds or plan includes them.
5. If credit depleted, system enforces restrictions (deny certain operations or throttle usage) and notifies admins.

### 4.6 Notifications
- Event triggers (invite sent, password reset, subscription change, credit low) call Notification Service to send templated emails.
- Emails via Resend; include idempotency and retry on failure.
- Optionally surface these events as in-app notifications.

### 4.7 Error Handling & Edge Cases
- Expired invite or reset token → user-friendly error and option to reissue a token.
- Out-of-order Stripe webhooks → store event.id and ensure idempotent processing.
- Race conditions (concurrent resource updates) → use DB transactions and optimistic locking where applicable.
- Tenant deletion → soft-delete flow and eventual hard-delete cleanup plan (data retention policy).
- OAuth email conflicts → conflict resolution policy (link accounts, ask user to confirm, or reject).

## 5 — Technical Requirements
### 5.1 Backend Details
- Language: Python 3.x
- Framework: FastAPI
- ORM: SQLAlchemy or SQLModel
- Database: PostgreSQL (via Supabase)
- Migrations: Alembic / Supabase migrations
- Auth: JWT access tokens + refresh tokens; OAuth (Google, LinkedIn)
- Hashing: Argon2 recommended; bcrypt acceptable
- Token storage: transient DB tables for invite/reset tokens with TTL
- API Style: REST (OpenAPI auto-generated)
- Testing: Pytest for unit/integration; mocking external APIs (Stripe, Resend)

### 5.2 Frontend Details
- Framework: Next.js (latest stable)
- Language: TypeScript preferred
- UI: Shadcn/ui components + Tailwind CSS
- Routing: Protect routes according to auth & role-based guards
- State management: React Context / lightweight state libs / Redux only if necessary
- E2E testing: Playwright or Cypress

### 5.3 Containerization & Env
- Dockerfiles per service & frontend
- Dev: docker-compose.yml for local development
- Prod: Kubernetes manifests / Helm charts
- Config: .env for dev, secrets manager for prod
- Logging: Centralized log collection (ELK, Loki, etc.)

## 6 — Data Isolation & Multi-Tenant Implementation Details
Preferred approach: Shared DB + shared schema with tenant_id columns + Row-Level Security (RLS) enforced from day one in Supabase/Postgres.

Tenant context determination: Middleware inspects incoming request host (subdomain) or X-Tenant-ID header to set tenant_id in request context.

Thread safety: Tenant context must be request-scoped; avoid globals. Use dependency injection or contextvars.

Schema selection vs RLS: RLS provides simpler operational overhead than separate schemas per tenant. If later needed, consider per-tenant schema option.

Migrations: Have a plan for schema changes across all tenant rows; test migrations in staging against representative data.

Testing RLS: Integration tests must validate RLS policies to ensure no cross-tenant data leakage.

## 7 — Testing Strategy
| Test Type | Coverage / What it Covers | Tools |
|-----------|---------------------------|-------|
| Unit Tests | Auth logic, validators, permission checks, business rules | Pytest |
| Integration Tests | API endpoints + DB + RLS policies; webhook handling | Pytest + test DB (Supabase test instance) |
| End-to-End (E2E) | Full flows: signup, invite, billing flows, credit usage | Playwright or Cypress |
| Contract Tests | Microservice API compatibility | Pact or contract testing tools |
| Security Tests | RLS tests, OWASP checks, pen testing | SAST/DAST tools, third-party pen tests |
| Performance / Load | Response time, concurrent tenant load | Locust, k6 |
| Regression | Automated suite on every PR | CI pipeline |

Minimum acceptable test coverage (example): 80% line coverage for backend; critical paths (auth, billing) require ~100% coverage.

## 8 — API & UI Documentation
- Backend: FastAPI auto-generated OpenAPI docs, with detailed request/response models and examples.
- Frontend: Component library docs, storybook for UI components (if desired).
- Project docs: /docs folder for architecture, deployment, API usage, environment setup, coding standards.
- Developer onboarding: markdown runbooks for local dev, testing, deploying, and debugging.

## 9 — Deployment & Operations
- Environments: dev, staging, production.
- CI/CD: PR → run tests & lint → build container → push image → deploy to staging → run E2E → promote to prod.
- Monitoring: Sentry (errors), Prometheus/Grafana (metrics), OpenTelemetry (traces).
- Stripe webhook handling: Verify signature; implement idempotent webhook handlers.
- Backups: Daily DB backups + point-in-time recovery.
- DR Plan: Recovery time objectives (RTO) and recovery point objectives (RPO) documented.
- Secrets rotation: Rotate keys periodically; revoke compromised keys.

## 10 — Milestones / Timeline (suggested phases)
| Phase | Deliverables |
|-------|--------------|
| Phase 1: Core Foundation | Repo scaffolding, CI/CD, Auth service (password + OAuth), tenant onboarding + RLS setup |
| Phase 2: RBAC & User Management | Roles & permissions, user invite flows, membership management UI |
| Phase 3: Billing & Credits | Stripe integration, plan & subscription flows, credit accounting & tracking |
| Phase 4: Notifications & Email | Resend integration, templates, event hooks |
| Phase 5: UI / Dashboard | Organization admin dashboard, user management, billing/usage views |
| Phase 6: Testing, Security & Performance | Full coverage tests, pen tests, load testing |
| Phase 7: Deployment & Launch | Production deployment, monitoring, runbooks, onboarding tenants |

## 11 — Risks & Mitigation
| Risk | Mitigation |
|------|------------|
| Cross-tenant data leakage | Enforce RLS policies, integration tests, code reviews, audit logs |
| OAuth conflicts (same email) | Define merge/link policy; notify users; require verification steps |
| Webhook failures / ordering | Idempotent handlers; persist processed Stripe event IDs; retry & alerting |
| Scaling challenges | Stateless services, DB tuning, caching, horizontal scaling |
| Operational overhead of many schemas | Automate provisioning; prefer shared schema + RLS unless multi-schema necessary |
| Billing & payments errors | Strong monitoring of Stripe webhooks; logging and alerting on failures |

## 12 — Quick Summary of Key Architectural Decisions
- Database: Single Postgres DB (Supabase) with shared schema + Row-Level Security (RLS) enforced from Day 1.
- Authentication: Password + OAuth (Google, LinkedIn). Users map to organizations via memberships.
- RBAC: Platform-managed role definitions; Org admins assign roles; one role per user per org (unique constraint).
- Billing/Credits: Stripe for subscriptions & payments; use webhooks and idempotency. Credit allocation via credit_transactions.
- Emails: Resend for transactional emails.
- Observability: OpenTelemetry for tracing across FastAPI + frontend, export via OTLP to chosen backend (SigNoz/Grafana Tempo/Honeycomb).
- Backend: Python + FastAPI microservices (containerized).
- Frontend: Next.js + Tailwind + shadcn/ui.
- Testing: TDD approach (pytest, Playwright/Cypress, Jest + RTL).

## 13 — Organization & Entities: Suggested Attributes (detailed)
### Organization (tenant)
- id (uuid PK)
- name (text)
- slug (text unique, used for subdomain routing)
- description (text)
- website (url)
- logo_url (text)
- address (jsonb: line1/line2/city/state/postal/country)
- timezone (IANA string)
- locale (e.g., en-US)
- billing_contact_id (FK -> users)
- stripe_customer_id (text)
- plan_id (FK -> plans)
- credit_balance (numeric)
- status (enum: trialing, active, suspended, cancelled)
- created_at, updated_at

### User
- id (uuid PK)
- email (unique)
- full_name
- avatar_url
- password_hash (nullable for OAuth-only)
- email_verified (bool)
- is_platform_admin (bool)
- created_at, last_login_at, last_seen_at

### Membership
- id (uuid)
- user_id (FK -> users)
- org_id (FK -> organizations)
- role_id (FK -> roles) — required
- status (invited, active, suspended)
- invited_by, invited_at, joined_at
- UNIQUE (user_id, org_id) — one role per user per org

### Role
- id (uuid)
- name (text)
- description
- is_platform_role (bool)
- created_by (user id)
- created_at

### Permission
- id (uuid)
- key (text unique, e.g. users.create)
- description

### Plan / Subscription / Credit / Billing
- plans: id, name, stripe_price_id, included_credits, features (jsonb), price, interval
- subscriptions: id, org_id, plan_id, stripe_subscription_id, status, start_date, end_date, cancel_at_period_end
- credit_transactions: id, org_id, amount, type, reason, metadata, created_at

### AuditLog
- id, org_id, user_id, action_key, details (jsonb), ip, user_agent, created_at

## 14 — Database Design: Sample DDL (Postgres / Supabase)
Adjust types/constraints as needed for production.

```sql
-- organizations
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    website text,
    logo_url text,
    address jsonb,
    timezone text,
    locale text,
    billing_contact_id uuid,
    stripe_customer_id text,
    plan_id uuid,
    credit_balance numeric DEFAULT 0,
    status text DEFAULT 'trialing',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- users
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    password_hash text,
    email_verified boolean DEFAULT false,
    is_platform_admin boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    last_login_at timestamptz
);

-- roles (platform-managed)
CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_platform_role boolean DEFAULT true,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);

-- permissions
CREATE TABLE permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    description text
);

-- role_permissions
CREATE TABLE role_permissions (
    role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
    permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- memberships (user -> org): one role per user per org enforced
CREATE TABLE memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    role_id uuid REFERENCES roles(id) NOT NULL,
    status text DEFAULT 'invited',
    invited_by uuid,
    invited_at timestamptz,
    joined_at timestamptz,
    UNIQUE (user_id, org_id) -- enforces single role per user per org
);

-- plans
CREATE TABLE plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    stripe_price_id text,
    included_credits integer DEFAULT 0,
    features jsonb,
    price numeric,
    interval text
);

-- subscriptions
CREATE TABLE subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organizations(id),
    plan_id uuid REFERENCES plans(id),
    stripe_subscription_id text,
    status text,
    start_date timestamptz,
    end_date timestamptz,
    cancel_at_period_end boolean DEFAULT false
);

-- credit transactions
CREATE TABLE credit_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organizations(id),
    amount numeric NOT NULL,
    type text, -- 'usage', 'topup', 'adjustment'
    reason text,
    metadata jsonb,
    created_at timestamptz DEFAULT now()
);

-- audit logs
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES organizations(id),
    user_id uuid,
    action_key text,
    details jsonb,
    ip text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);
```

## 15 — Row-Level Security (RLS) Patterns & Example Supabase Policies
Design principle: centralize access checks in DB policies. Use memberships to map auth.uid() to users.id.

Enable RLS:
```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
```

Example: allow org members to select organization row
```sql
CREATE POLICY "org_select_for_members" ON organizations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM memberships 
        WHERE memberships.org_id = organizations.id 
        AND memberships.user_id = auth.uid()::uuid 
        AND memberships.status = 'active'
    )
);
```

Membership self read
```sql
CREATE POLICY "membership_self" ON memberships FOR SELECT 
USING (user_id = auth.uid()::uuid);
```

Credit transactions for organization members
```sql
CREATE POLICY "credit_transactions_for_org" ON credit_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM memberships 
        WHERE memberships.org_id = credit_transactions.org_id 
        AND memberships.user_id = auth.uid()::uuid 
        AND memberships.status = 'active'
    )
);
```

### Notes
Prefer to do complex RBAC checks at application layer for actions (create/update/delete), while using RLS to enforce row-level read/write restrictions.

For platform-admin-only operations, either use a separate service role (with platform credentials) or encode is_platform_admin as a JWT claim and check in policies.

## 16 — Roles & Permissions Enforcement Rules
- Role creation/modification: Only Platform Admins may create / update / delete role and permission definitions. Mark platform-defined roles with is_platform_role = true.
- Assigning roles: Organization Admins can assign roles to users in their organization, but cannot create or modify role definitions.
- Role-per-user limitation: Enforced by DB unique constraint UNIQUE(user_id, org_id) so a user has exactly one role per org.
- Permission checks:
  - Frontend: guard UI elements based on role/permission.
  - Backend: every endpoint verifies membership role and required permissions.
  - DB: RLS enforces that the user only reads/writes rows for their tenant.

## 17 — API Endpoints (high-level & representative)
### Authentication / Identity Service
- POST /auth/signup — { email, password, full_name, org_slug? }
- POST /auth/login — { email, password } → returns { access_token, refresh_token }
- GET /auth/oauth/google → redirect flow
- GET /auth/oauth/linkedin → redirect flow
- POST /auth/forgot-password — { email } → sends reset token
- POST /auth/reset-password — { token, new_password }
- POST /auth/verify-email — { token }

### Organization Management
- POST /orgs — create org (platform admin or signup flow)
- GET /orgs — list orgs visible to caller (platform admin sees all)
- GET /orgs/{org_id} — org detail
- PATCH /orgs/{org_id} — update org
- DELETE /orgs/{org_id} — soft delete

### User / Membership Management
- GET /orgs/{org_id}/members — list members (org admin)
- POST /orgs/{org_id}/members/invite — invite new user (send email)
- PATCH /orgs/{org_id}/members/{membership_id} — update role/status
- DELETE /orgs/{org_id}/members/{membership_id} — remove member

### Roles & Permissions
- GET /roles — list roles
- POST /roles — create role (platform-admin)
- PATCH /roles/{role_id} — update role (platform-admin)
- GET /permissions — list permissions
- POST /permissions — create permission (platform-admin)

### Billing / Stripe
- GET /orgs/{org_id}/billing — billing summary
- POST /orgs/{org_id}/subscriptions — create subscription
- POST /stripe/webhook — Stripe event receiver (verify signature)
- GET /orgs/{org_id}/invoices — list invoices (optional)

### Notifications
- POST /notifications/email — internal endpoint to send templated emails (invokes Resend)

### Audit / Admin
- GET /orgs/{org_id}/auditlogs — read audit logs (platform admins & org owners)

### Notes
All protected endpoints require authentication; validate membership and permissions per request.

Use consistent error formats and HTTP status codes. Include structured error responses with codes.

## 18 — Stripe Webhooks & Idempotency (best practices)
- Verify signature using Stripe webhook signing secret (Stripe-Signature header). Reject invalid signatures.
- Idempotency: store processed event.id (Stripe event id) in DB and check before processing to avoid double-processing.
- Ordering: Stripe events can be delivered out of order. Use the event payload to determine final state; design handlers to handle eventual consistency.
- Retries: If processing fails, return non-2xx so Stripe retries. Implement exponential backoff on internal retries.
- Idempotency keys: use idempotency keys for outgoing requests to Stripe to avoid duplicate side effects.
- Logging & alerting: Log failures and alert on repeated webhook processing failures.

## 19 — Observability (OpenTelemetry) — Instrumentation & Pipeline
### Goals
- Capture distributed traces across frontend and backend.
- Export spans to OTLP collector and chosen backend (SigNoz, Grafana Tempo, Honeycomb).
- Capture metrics: latency, error rates, subscription events, credit consumption.
- Centralized logs with correlation IDs and trace IDs.

### FastAPI (backend) instrumentation example (bootstrap)
```python
# instrumentation.py (example)
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

resource = Resource.create({"service.name": "billing-service"})
provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
```
then enable instrumentation for FastAPI/requests/sqlalchemy

### Frontend (Next.js)
- Use OpenTelemetry JS SDK for navigation traces and performance metrics (FCP, LCP, TTFB).
- Propagate trace context from frontend to backend via HTTP headers.

### Recommendations
- Centralize traces in OTLP collector.
- Use sampling rules for high-traffic endpoints.
- Annotate traces with org_id carefully (avoid exposing PII in traces if backend is externally hosted).

## 20 — Security Considerations (detailed)
- Password hashing: Argon2 preferred; if using bcrypt, use high work factor.
- Tokens: Use secure, expiring, single-use tokens for password reset and invites. Store token digests in DB.
- JWTs: Short-lived access tokens; refresh tokens rotated and revocable. Consider storing refresh tokens with hashed values to support revocation.
- Transport security: TLS for all endpoints; HSTS in production.
- RLS: Enable and test DB-level policies; do not rely only on app-layer checks.
- Sensitive logging: Redact secrets, credit card numbers (never log), and password fields.
- Rate limiting: Protect endpoints from brute-force (login, password reset).
- Third-party secrets: Rotate Stripe and Resend keys regularly; keep in secret manager.
- Vulnerability scanning: Keep dependencies updated; run SAST/DAST regularly.
- Audit logging: Log role changes, billing events, tenant deletions, and admin actions with timestamps and actor info.

## 21 — Testing Strategy — Mapping to Features
- Auth flows: Unit + integration tests: signup, login, OAuth linking, reset tokens, token expiry.
- RBAC & RLS: Integration tests that exercise DB RLS policies for read/write across tenants (attempt cross-tenant access must fail).
- Billing & Stripe: Integration tests using Stripe test mode and mock webhooks. Test idempotency and out-of-order delivery.
- Invite & Onboarding: E2E tests: invite creation, email content, token acceptance, membership uniqueness collision scenarios.
- Credit accounting: Unit & integration tests for credit allocation, usage deduction, negative balance handling, and enforcement.
- Notifications: Tests for email generation and retry behavior using mocked Resend API.
- Performance: Load test endpoints (auth, billing webhook processing) with many concurrent tenants.
- Security: Automated tests for common vulnerabilities (XSS, CSRF), and RLS validation tests.

## 22 — Example Sequence Flows (textual)
### User Invite Flow
1. Org admin calls POST /orgs/{org_id}/members/invite with { email, role_id }.
2. Backend creates membership row with status='invited' and issues an invite token.
3. Backend sends an invite email via Notifications Service (Resend) with invite link including token.
4. Invitee clicks link → POST /auth/accept-invite with token.
5. Backend validates token, creates or links users row, updates memberships.status='active', sets joined_at.
6. If UNIQUE(user_id, org_id) conflict occurs (user already a member), return conflict error with guidance.

### Subscription Upgrade & Credit Allocation
1. Org admin requests upgrade in UI → POST /orgs/{org_id}/subscriptions (backend uses idempotency key).
2. Backend creates subscription via Stripe API.
3. Stripe processes payment and emits invoice.payment_succeeded or customer.subscription.updated.
4. Stripe posts webhook to /stripe/webhook. Backend verifies signature and checks if event.id already processed; if not, processes.
5. Backend updates subscriptions record, creates credit_transactions for included credits, updates organizations.credit_balance.
6. Notifications Service sends email to org admins about the change.

## 23 — Example Access Control Checks (pseudocode)
```python
def require_org_admin(user, org_id):
    membership = db.query(Membership).filter_by(user_id=user.id, org_id=org_id).one_or_none()
    if membership is None or membership.status != 'active':
        raise Forbidden("Not a member or inactive")
    role = db.query(Role).get(membership.role_id)
    if 'org.admin' not in role.permissions:
        raise Forbidden("Insufficient permissions")
```

Enforce the same checks as DB-level RLS to avoid mismatches.

Prefer middleware/dependency in FastAPI for reuse across endpoints.

## 24 — CI/CD, Infra & Deployment Notes
- Local/dev: docker-compose.yml with Postgres, Redis (optional), mock Stripe (or use test mode), and backend services.
- CI pipeline (example):
  1. Lint + static checks
  2. Run unit tests (Pytest)
  3. Build Docker images
  4. Push images to registry
  5. Deploy to staging
  6. Run integration & E2E tests against staging
  7. Promote to production on green
- Production infra: Kubernetes (managed K8s cluster), ingress controller, autoscaling, secrets store (Vault/KMS).
- Migrations: Alembic migrations as part of CI; test migrations in staging before production. Include RLS policy migrations tests.
- Backups: Daily backups + PITR (point-in-time recovery). Periodic restore drills.

## 25 — Observability & Monitoring Checklist
- Instrument FastAPI services with OpenTelemetry (HTTP, DB, HTTP clients).
- Instrument frontend (OpenTelemetry JS) for RUM metrics (FCP, LCP).
- Collect metrics: request latency, error rates, subscription events, credit consumption rate, email send/failure rate, webhook processing success/failure.
- Centralized logging with trace IDs & correlation IDs.
- Alerts on critical signals: payment failures, repeated webhook failures, credit depletion for high-value tenants, RLS anomalies.
- Dashboards for billing & usage for product & finance teams.

## 26 — Appendix / Notes
- Idempotency & Deduplication: Keep a persistent table of processed external event IDs (e.g., stripe_event_logs) to avoid double-processing.
- Email templates: Maintain a templating system for transactional emails (invite, reset, billing) with version control.
- Tenant deletion policy: Define soft-delete policy, retention schedule, and GDPR-compliant deletion flow.
- Feature flags: Use flags for gradual rollouts and tenant-specific feature toggles.
- Seed data: On platform init, seed default roles, permissions, and system plans (e.g., trial, starter, pro).