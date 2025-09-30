# API Guidelines

This document outlines the guidelines for designing and implementing APIs in the multi-tenant SaaS platform.

## General Principles

-   **RESTful**: Adhere to REST principles for resource-oriented design.
-   **Stateless**: API requests should contain all necessary information for processing.
-   **Predictable URLs**: Use clear, consistent, and hierarchical URLs.
-   **Standard HTTP Methods**: Use `GET`, `POST`, `PUT`, `PATCH`, `DELETE` appropriately.
-   **JSON for Request/Response**: All requests and responses should use JSON format.
-   **Versioned**: APIs should be versioned to allow for backward compatibility.

## Naming Conventions

-   **Resources**: Use plural nouns for resource names (e.g., `/users`, `/organizations`).
-   **Parameters**: Use `snake_case` for query parameters and request body fields.
-   **Headers**: Use `kebab-case` for custom HTTP headers.

## Request and Response

### Request Headers

-   `Authorization`: Bearer token for authentication.
-   `Content-Type`: `application/json` for request bodies.
-   `Accept`: `application/json` for desired response format.

### Response Status Codes

-   **200 OK**: Successful `GET`, `PUT`, `PATCH`, `DELETE`.
-   **201 Created**: Successful `POST`.
-   **204 No Content**: Successful `DELETE` with no response body.
-   **400 Bad Request**: Invalid request payload or parameters.
-   **401 Unauthorized**: Missing or invalid authentication credentials.
-   **403 Forbidden**: Authenticated user does not have necessary permissions.
-   **404 Not Found**: Resource not found.
-   **409 Conflict**: Resource already exists or a conflict prevents creation.
-   **500 Internal Server Error**: Generic server error.

### Error Responses

Error responses should follow a consistent structure, including:

```json
{
  "detail": "Error message description",
  "code": "error_code_identifier",
  "fields": [
    {
      "field": "field_name",
      "message": "Field specific error message"
    }
  ]
}
```

## Authentication and Authorization

-   **Authentication**: JWT tokens issued by Supabase are used for authenticating API requests.
-   **Authorization**: Role-Based Access Control (RBAC) is enforced at the API level to ensure users only access resources they are authorized for.

## Pagination, Filtering, and Sorting

-   **Pagination**: Use `limit` and `offset` (or `page` and `per_page`) query parameters.
-   **Filtering**: Use query parameters for filtering (e.g., `/users?status=active`).
-   **Sorting**: Use `sort_by` and `order` query parameters (e.g., `/users?sort_by=created_at&order=desc`).

## Rate Limiting

-   Implement rate limiting to prevent abuse and ensure fair usage of API resources.
-   Communicate rate limit details via HTTP headers (e.g., `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

## Documentation

-   All API endpoints should be documented using OpenAPI (Swagger) specifications.
-   Maintain up-to-date documentation for all API versions.