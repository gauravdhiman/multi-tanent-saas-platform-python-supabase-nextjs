# Frontend Architecture Overview

This document provides an overview of the frontend application's architecture, built using Next.js, React, and TypeScript. The project follows a modular structure to ensure maintainability, scalability, and a clear separation of concerns.

## Project Structure

The `frontend/src` directory is the core of the application and contains the following key subdirectories:

-   **`app/`**: Contains the main Next.js application routes and layouts. This is where page-level components and the root layout (`layout.tsx`) are defined.
    -   `layout.tsx`: Defines the root layout, imports global styles, sets up context providers, and initializes OpenTelemetry.
    -   `page.tsx`: The main landing page of the application, handling user authentication, displaying subscription plans, and showcasing features.

-   **`components/`**: Houses reusable UI components, categorized by their domain or purpose. This promotes reusability and consistency across the application.
    -   `auth/`: Components related to authentication, such as sign-in/sign-up forms and protected routes.
    -   `billing/`: Components for managing billing information, plan selection, and credit purchases.
    -   `dashboard/`: Components specific to the user dashboard, including RBAC-related displays and notifications.
    -   `layout/`: Layout components for different sections of the application (e.g., `app-layout.tsx`, `dashboard-layout.tsx`).
    -   `organizations/`: Components for creating, editing, deleting, and selecting organizations.
    -   `ui/`: Generic, atomic UI components (e.g., buttons, cards, forms) built using a UI library (likely Shadcn UI based on file names).
    -   `providers.tsx`: Centralizes the application's context providers.

-   **`contexts/`**: Manages global state and provides data to components without prop-drilling. Each context typically encapsulates a specific domain of application state.
    -   `auth-context.tsx`: Manages user authentication state and provides authentication-related functions.
    -   `organization-context.tsx`: Manages the currently selected organization's state and related functionalities.
    -   `theme-context.tsx`: Manages the application's theme (e.g., dark/light mode).

-   **`hooks/`**: Contains custom React hooks for encapsulating reusable logic, especially for data fetching and state management related to specific features.
    -   `use-billing-info.ts`, `use-credit-balance.ts`, `use-subscription-plans.ts`: Hooks for fetching and managing billing and subscription data.
    -   `use-organization-by-id.ts`, `use-user-organizations.ts`: Hooks for fetching and managing organization data.
    -   `use-rbac.ts`, `use-user-permissions.ts`: Hooks for interacting with the Role-Based Access Control system.
    -   `use-user-profile.ts`: Hook for fetching and managing user profile data.

-   **`lib/`**: Stores utility functions, configurations, and third-party library integrations.
    -   `api/client.ts`: Configures and provides an API client for interacting with the backend.
    -   `opentelemetry-helpers.ts`, `opentelemetry.ts`: OpenTelemetry configuration and helper functions for tracing and metrics.
    -   `organization-utils.ts`: Utility functions related to organization management.
    -   `stripe.ts`: Integrations and utility functions for Stripe.
    -   `supabase.ts`: Supabase client initialization and related utilities.
    -   `utils.ts`: General-purpose utility functions.

-   **`services/`**: Defines client-side services responsible for making API calls to the backend and handling data transformations. These services abstract away the details of API interactions from components and hooks.
    -   `billing-service.ts`: Handles API calls related to billing, subscriptions, and credits.
    -   `organization-service.ts`: Handles API calls related to organization management.
    -   `rbac-service.ts`: Handles API calls related to Role-Based Access Control.

-   **`types/`**: Contains TypeScript type definitions and interfaces for data structures used throughout the frontend application. This ensures type safety and improves code readability.
    -   `api.ts`, `auth.ts`, `billing.ts`, `organization.ts`, `rbac.ts`, `user.ts`: Type definitions for API responses, authentication, billing entities, organizations, RBAC entities, and user profiles.
    -   `common.ts`, `index.ts`: General and shared type definitions.

## Data Flow and Interaction

1.  **User Interaction**: Users interact with components defined in `components/`.
2.  **Event Handling**: Components trigger events or call functions provided by hooks or contexts.
3.  **State Management**: Custom hooks (`hooks/`) or context providers (`contexts/`) manage local or global state, often by calling services.
4.  **API Calls**: Services (`services/`) make API requests to the backend using the API client (`lib/api/client.ts`).
5.  **Data Processing**: Responses from the backend are processed, potentially transformed, and then used to update state.
6.  **UI Updates**: Components re-render based on state changes, reflecting the updated data to the user.

## Key Technologies

-   **Next.js**: React framework for server-side rendering, static site generation, and API routes.
-   **React**: JavaScript library for building user interfaces.
-   **TypeScript**: Statically typed superset of JavaScript for improved code quality and maintainability.
-   **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
-   **Supabase**: Backend-as-a-Service for authentication, database, and real-time subscriptions.
-   **Stripe**: Payment processing for subscriptions and one-time payments.
-   **OpenTelemetry**: Observability framework for distributed tracing and metrics.

This architecture promotes a clean, scalable, and maintainable frontend application, allowing for efficient development and easy integration with backend services.