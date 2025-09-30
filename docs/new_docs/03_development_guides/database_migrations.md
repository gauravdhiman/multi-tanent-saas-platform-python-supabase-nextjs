# Database Migrations

## Overview

This document outlines the process and best practices for managing database schema changes using migrations.

## Tools Used

- **Alembic**: For database migrations in Python applications.

## Workflow

1.  **Create a new migration script**:
    ```bash
    alembic revision --autogenerate -m "Description of changes"
    ```
2.  **Review the generated script**:
    - Verify that the `upgrade()` and `downgrade()` functions correctly reflect the intended schema changes.
    - Manually adjust the script if `autogenerate` misses anything or generates incorrect statements.
3.  **Apply the migration**:
    ```bash
    alembic upgrade head
    ```
4.  **Revert a migration (if necessary)**:
    ```bash
    alembic downgrade -1
    ```

## Best Practices

- **Small, focused migrations**: Each migration should address a single logical change.
- **Idempotency**: Migration scripts should be runnable multiple times without issues.
- **Testing**: Always test migrations in a development environment before applying to production.
- **Version Control**: Migration scripts should be committed to version control.
- **No direct schema changes**: All schema changes should go through the migration process.

## Common Scenarios

- Adding a new table
- Adding/removing columns
- Modifying column types
- Renaming tables/columns
- Adding/removing indexes
- Data migrations (e.g., populating new columns)