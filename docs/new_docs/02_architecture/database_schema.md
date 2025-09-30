# Database Schema Design

This document outlines the database schema design for the application, detailing the tables, their relationships, and the core capabilities implemented for each entity. The application primarily uses Supabase as its backend, interacting with tables through the `supabase.table()` client.

## Identified Tables and Their Capabilities

Based on the analysis of service files in `backend/src`, the following tables have been identified:

### 1. `organizations`

*   **Description:** Stores information about different organizations within the multi-tenant SaaS platform.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `name`: VARCHAR(100), Not Null, Unique
    *   `description`: TEXT, Nullable
    *   `slug`: VARCHAR(100), Not Null, Unique
    *   `website`: VARCHAR(500), Nullable
    *   `is_active`: BOOLEAN, Not Null, Default: `true`
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `credit_balance`: INTEGER, Not Null, Default: `0`
*   **Capabilities (from `organization/service.py`):**
    *   Create new organizations.
    *   Retrieve organization details by ID or slug.
    *   List all organizations.
    *   Update organization information.
    *   Delete organizations.

### 2. `subscription_plans`

*   **Description:** Defines various subscription plans available to organizations.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `name`: VARCHAR(100), Not Null, Unique
    *   `description`: TEXT, Nullable
    *   `stripe_price_id`: VARCHAR(255), Not Null, Unique
    *   `stripe_product_id`: VARCHAR(255), Not Null
    *   `price_amount`: INTEGER, Not Null, Comment: 'Price in cents'
    *   `currency`: VARCHAR(3), Not Null, Default: 'USD'
    *   `interval`: VARCHAR(20), Not Null (e.g., 'monthly', 'annual')
    *   `interval_count`: INTEGER, Not Null, Default: '1'
    *   `included_credits`: INTEGER, Not Null, Default: '0'
    *   `max_users`: INTEGER, Nullable
    *   `features`: JSONB, Nullable
    *   `is_active`: BOOLEAN, Not Null, Default: `true`
    *   `trial_period_days`: INTEGER, Nullable
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `billing/service.py`):**
    *   Create new subscription plans.
    *   Retrieve subscription plan details (all or by specific criteria).
    *   Update existing subscription plans.

### 3. `organization_subscriptions`

*   **Description:** Links organizations to their active subscription plans.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `organization_id`: UUID, Not Null, Foreign Key to `organizations.id`
    *   `subscription_plan_id`: UUID, Nullable, Foreign Key to `subscription_plans.id`
    *   `stripe_subscription_id`: VARCHAR(255), Nullable, Unique
    *   `stripe_customer_id`: VARCHAR(255), Not Null
    *   `status`: VARCHAR(50), Not Null (e.g., 'trial', 'active', 'past_due', 'cancelled', 'expired')
    *   `current_period_start`: TIMESTAMP with timezone, Nullable
    *   `current_period_end`: TIMESTAMP with timezone, Nullable
    *   `trial_start`: TIMESTAMP with timezone, Nullable
    *   `trial_end`: TIMESTAMP with timezone, Nullable
    *   `cancel_at_period_end`: BOOLEAN, Not Null, Default: `false`
    *   `cancelled_at`: TIMESTAMP with timezone, Nullable
    *   `metadata`: JSONB, Nullable
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `billing/service.py`):**
    *   Create new organization subscriptions.
    *   Retrieve organization subscription details (all or by specific criteria).
    *   Update existing organization subscriptions.

### 4. `credit_transactions`

*   **Description:** Records all credit-related transactions for organizations.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `organization_id`: UUID, Not Null, Foreign Key to `organizations.id`
    *   `transaction_type`: VARCHAR(50), Not Null (e.g., 'earned', 'purchased', 'consumed', 'expired')
    *   `amount`: INTEGER, Not Null (positive for credits added, negative for consumed)
    *   `balance_after`: INTEGER, Not Null
    *   `source`: VARCHAR(50), Not Null (e.g., 'subscription', 'purchase', 'event_consumption', 'expiry')
    *   `source_id`: UUID, Nullable (reference to subscription, purchase, or event)
    *   `credit_event_id`: UUID, Nullable, Foreign Key to `credit_events.id`
    *   `expires_at`: TIMESTAMP with timezone, Nullable (for subscription credits)
    *   `stripe_payment_intent_id`: VARCHAR(255), Nullable
    *   `description`: TEXT, Nullable
    *   `metadata`: JSONB, Nullable
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `billing/service.py`):**
    *   Create new credit transactions.
    *   Retrieve credit transaction details (all, by specific criteria, subscription credits, purchased credits, expiring credits, usage).

### 5. `credit_events`

*   **Description:** Logs events related to credit usage and allocation.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `name`: VARCHAR(100), Not Null, Unique
    *   `description`: TEXT, Nullable
    *   `credit_cost`: INTEGER, Not Null
    *   `category`: VARCHAR(50), Not Null (e.g., 'api_call', 'storage', 'compute')
    *   `is_active`: BOOLEAN, Not Null, Default: `true`
    *   `metadata`: JSONB, Nullable
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `billing/service.py`):**
    *   Retrieve credit event details (all or by specific criteria).

### 6. `credit_products`

*   **Description:** Defines different credit products that can be offered.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `name`: VARCHAR(100), Not Null, Unique
    *   `description`: TEXT, Nullable
    *   `stripe_price_id`: VARCHAR(255), Not Null, Unique
    *   `stripe_product_id`: VARCHAR(255), Not Null
    *   `credit_amount`: INTEGER, Not Null
    *   `price_amount`: INTEGER, Not Null, Comment: 'Price in cents'
    *   `currency`: VARCHAR(3), Not Null, Default: 'USD'
    *   `is_active`: BOOLEAN, Not Null, Default: `true`
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `billing/service.py`):**
    *   Retrieve credit product details (all or by specific criteria).

### 7. `billing_history`

*   **Description:** Stores a historical record of billing activities.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `organization_id`: UUID, Not Null, Foreign Key to `organizations.id`
    *   `stripe_invoice_id`: VARCHAR(255), Nullable, Unique
    *   `stripe_payment_intent_id`: VARCHAR(255), Nullable
    *   `amount`: INTEGER, Not Null, Comment: 'Amount in cents'
    *   `currency`: VARCHAR(3), Not Null, Default: 'USD'
    *   `status`: VARCHAR(50), Not Null (e.g., 'pending', 'paid', 'failed', 'refunded')
    *   `description`: TEXT, Nullable
    *   `invoice_url`: TEXT, Nullable
    *   `receipt_url`: TEXT, Nullable
    *   `billing_reason`: VARCHAR(50), Nullable (e.g., 'subscription_create', 'subscription_cycle', 'manual')
    *   `metadata`: JSONB, Nullable
    *   `paid_at`: TIMESTAMP with timezone, Nullable
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `billing/service.py`):**
    *   Create new billing history records.
    *   Retrieve billing history records (all or by specific criteria).

### 8. `permissions`

*   **Description:** Defines individual permissions that can be assigned to roles.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `name`: VARCHAR(100), Not Null, Unique
    *   `description`: TEXT, Nullable
    *   `resource`: VARCHAR(50), Not Null
    *   `action`: VARCHAR(50), Not Null
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `rbac/permissions/service.py`):**
    *   Create new permissions.
    *   Retrieve permission details by ID or name.
    *   List all permissions.
    *   Update permission information.
    *   Delete permissions (also handles associated `role_permissions`).

### 9. `role_permissions`

*   **Description:** Maps roles to their assigned permissions.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `role_id`: UUID, Not Null, Foreign Key to `roles.id`
    *   `permission_id`: UUID, Not Null, Foreign Key to `permissions.id`
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `rbac/permissions/service.py` and `rbac/roles/service.py`):**
    *   Assign permissions to roles.
    *   Remove permissions from roles.
    *   Retrieve permissions associated with a specific role.

### 10. `roles`

*   **Description:** Defines different user roles within the system.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `name`: VARCHAR(50), Not Null, Unique
    *   `description`: TEXT, Nullable
    *   `is_system_role`: BOOLEAN, Not Null, Default: `false`
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `rbac/roles/service.py`):**
    *   Create new roles.
    *   Retrieve role details by ID or name.
    *   List all roles.
    *   Update role information.
    *   Delete roles (also handles associated `role_permissions` and `user_roles`).

### 11. `user_roles`

*   **Description:** Assigns roles to users, potentially within specific organizations.
*   **Schema:**
    *   `id`: UUID, Primary Key, Default: `gen_random_uuid()`
    *   `user_id`: UUID, Not Null, Foreign Key to `auth.users.id`
    *   `role_id`: UUID, Not Null, Foreign Key to `roles.id`
    *   `organization_id`: UUID, Nullable, Foreign Key to `organizations.id`
    *   `created_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
    *   `updated_at`: TIMESTAMP with timezone, Not Null, Default: `NOW()`
*   **Capabilities (from `rbac/user_roles/service.py`):**
    *   Assign roles to users.
    *   Update user role assignments.
    *   Remove user role assignments.
    *   Retrieve user role details (e.g., by user ID, organization ID).
    *   Retrieve roles associated with a specific user.
    *   Check if a user has a specific permission.
    *   Retrieve organizations associated with a user.

## Relationships

*   **`organizations`** can have multiple **`organization_subscriptions`**.
*   **`organization_subscriptions`** link to **`subscription_plans`**.
*   **`organizations`** are associated with **`credit_transactions`**, **`credit_events`**, and **`billing_history`**.
*   **`roles`** are linked to **`permissions`** via **`role_permissions`**.
*   **`users`** (implicitly, through authentication) are linked to **`roles`** via **`user_roles`**, and potentially to **`organizations`** via **`user_roles`**.

## Further Analysis Needed

While the service files provide insights into table interactions, a more detailed understanding of the exact schema (column names, data types, constraints) would require direct inspection of the Supabase database or schema definition files if they exist. The "Capabilities" sections above are inferred from the operations performed in the service files (e.g., `insert`, `select`, `update`, `delete`, `eq`, `match`).

This document will be updated as more detailed schema information becomes available.