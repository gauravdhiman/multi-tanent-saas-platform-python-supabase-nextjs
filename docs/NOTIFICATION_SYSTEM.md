# Email Notification System

## Overview

The Email Notification System provides a comprehensive solution for sending transactional emails to users and stakeholders. It integrates with [Resend.com](https://resend.com) for reliable email delivery and includes an admin interface for configuring notification events and templates.

## Features

✅ **Configurable Notification Events** - Platform admins can add, remove, enable, or disable notification events  
✅ **Beautiful Email Templates** - Pre-built, responsive HTML email templates with modern design  
✅ **Template Management** - Create and manage custom email templates via API  
✅ **Variable Substitution** - Dynamic content injection using template variables  
✅ **Notification Logging** - Track all sent notifications with delivery status  
✅ **Multiple Categories** - Organize notifications by category (auth, billing, organization, etc.)  
✅ **Resend Integration** - Reliable email delivery via Resend.com  
✅ **Configurable Sender** - Configure sender email and name per template or globally  

## Architecture

### Database Schema

The notification system uses three main tables:

```
notification_events
├── id (UUID)
├── name (VARCHAR)
├── description (TEXT)
├── event_key (VARCHAR) - Unique identifier
├── category (VARCHAR) - auth, billing, organization, system, custom
├── is_enabled (BOOLEAN)
├── default_template_id (UUID) - FK to notification_templates
├── metadata (JSONB)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

notification_templates
├── id (UUID)
├── name (VARCHAR)
├── description (TEXT)
├── subject (VARCHAR)
├── html_content (TEXT)
├── text_content (TEXT)
├── from_email (VARCHAR)
├── from_name (VARCHAR)
├── template_variables (JSONB)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

notification_logs
├── id (UUID)
├── notification_event_id (UUID) - FK to notification_events
├── notification_template_id (UUID) - FK to notification_templates
├── organization_id (UUID) - FK to organizations
├── user_id (UUID)
├── recipient_email (VARCHAR)
├── recipient_name (VARCHAR)
├── subject (VARCHAR)
├── status (VARCHAR) - pending, sent, failed, bounced
├── provider (VARCHAR) - resend
├── provider_message_id (VARCHAR)
├── error_message (TEXT)
├── sent_at (TIMESTAMP)
├── metadata (JSONB)
└── created_at (TIMESTAMP)
```

## Setup

### 1. Environment Configuration

Add the following to your `.env` file:

```bash
# Resend Settings
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=SaaS Platform
```

### 2. Install Dependencies

The Resend SDK is already added to `requirements.txt`:

```bash
resend==2.5.0
```

### 3. Run Database Migration

Apply the notification system migration:

```bash
cd backend
alembic upgrade head
```

### 4. Seed Notification Events

Run the seed script to initialize notification events:

```bash
cd backend
python scripts/seed_notification_events.py
```

This will create the following notification events:
- `user.signup` - Welcome email
- `user.password_reset` - Password reset email
- `user.email_verification` - Email verification
- `subscription.created` - Subscription activated
- `subscription.cancelled` - Subscription cancelled
- `credits.low_balance` - Low credit balance warning
- `credits.purchased` - Credits purchase confirmation
- `organization.invitation` - Organization invitation
- `billing.payment_failed` - Payment failed notification

## API Reference

### Specialized Notification Requests

#### Request Email Verification
```http
POST /api/notifications/request-verification-email
Authorization: Bearer {token}

{
  "email": "user@example.com",
  "user_name": "John Doe",
  "user_id": "uuid-here"
}
```

Response:
```json
{
  "success": true,
  "notification_log_id": "uuid-here",
  "status": "sent",
  "message": "Notification sent successfully"
}
```

This endpoint allows authenticated users to request an email verification notification. Users can only request verification for their own email address unless they have platform_admin role.

### Admin Endpoints

#### Create Notification Event
```http
POST /api/notifications/admin/events
Authorization: Bearer {token}

{
  "name": "Welcome Email",
  "description": "Sent when a new user signs up",
  "event_key": "user.signup",
  "category": "auth",
  "is_enabled": true,
  "default_template_id": null,
  "metadata": {}
}
```

#### List Notification Events
```http
GET /api/notifications/admin/events?category=auth&is_enabled=true
Authorization: Bearer {token}
```

#### Update Notification Event
```http
PUT /api/notifications/admin/events/{event_id}
Authorization: Bearer {token}

{
  "is_enabled": false
}
```

#### Delete Notification Event
```http
DELETE /api/notifications/admin/events/{event_id}
Authorization: Bearer {token}
```

#### Create Notification Template
```http
POST /api/notifications/admin/templates
Authorization: Bearer {token}

{
  "name": "Custom Welcome Template",
  "description": "Custom branded welcome email",
  "subject": "Welcome to {app_name}!",
  "html_content": "<html>...</html>",
  "text_content": "Welcome...",
  "from_email": "hello@yourdomain.com",
  "from_name": "Your Brand",
  "template_variables": ["user_name", "app_name"],
  "is_active": true
}
```

#### List Notification Templates
```http
GET /api/notifications/admin/templates?is_active=true
Authorization: Bearer {token}
```

#### Update Notification Template
```http
PUT /api/notifications/admin/templates/{template_id}
Authorization: Bearer {token}

{
  "subject": "Updated Subject",
  "is_active": true
}
```

#### Delete Notification Template
```http
DELETE /api/notifications/admin/templates/{template_id}
Authorization: Bearer {token}
```

### Public Endpoints


#### Get Notification Logs
```http
GET /api/notifications/logs?organization_id={uuid}&status_filter=sent&limit=50
Authorization: Bearer {token}
```

#### Get Notification Stats
```http
GET /api/notifications/stats?organization_id={uuid}
Authorization: Bearer {token}
```

Response:
```json
{
  "total_sent": 150,
  "total_failed": 5,
  "total_pending": 2,
  "by_event": {
    "event-uuid-1": 50,
    "event-uuid-2": 100
  },
  "by_status": {
    "sent": 150,
    "failed": 5,
    "pending": 2
  },
  "recent_failures": [...]
}
```

#### Health Check
```http
GET /api/notifications/health
```

Response:
```json
{
  "status": "healthy",
  "resend_configured": true,
  "from_email": "noreply@yourdomain.com"
}
```

## Built-in Email Templates

The system includes 9 beautiful, pre-built email templates:

### 1. Welcome Email (`user.signup`)
Sent when a new user creates an account.

**Variables:**
- `user_name` - User's name
- `user_email` - User's email address
- `created_at` - Account creation date
- `dashboard_url` - Link to dashboard

### 2. Password Reset (`user.password_reset`)
Sent when a user requests a password reset.

**Variables:**
- `user_name` - User's name
- `reset_url` - Password reset link
- `expiry_hours` - Link expiration time

### 3. Email Verification (`user.email_verification`)
Sent to verify a user's email address.

**Variables:**
- `user_name` - User's name
- `verification_url` - Verification link
- `expiry_hours` - Link expiration time

### 4. Subscription Activated (`subscription.created`)
Sent when a subscription is successfully created.

**Variables:**
- `user_name` - User's name
- `plan_name` - Subscription plan name
- `billing_interval` - monthly/annual
- `amount` - Subscription cost
- `next_billing_date` - Next billing date
- `included_credits` - Credits included in plan
- `billing_dashboard_url` - Link to billing dashboard

### 5. Subscription Cancelled (`subscription.cancelled`)
Sent when a subscription is cancelled.

**Variables:**
- `user_name` - User's name
- `plan_name` - Plan name
- `access_until` - Access end date
- `reactivate_url` - Reactivation link
- `feedback_url` - Feedback form link

### 6. Low Credit Balance (`credits.low_balance`)
Warning email when credits are running low.

**Variables:**
- `user_name` - User's name
- `current_credits` - Current credit balance
- `organization_name` - Organization name
- `purchase_credits_url` - Link to purchase credits

### 7. Credits Purchased (`credits.purchased`)
Confirmation when credits are purchased.

**Variables:**
- `user_name` - User's name
- `credits_added` - Credits added
- `amount_paid` - Payment amount
- `new_balance` - New credit balance
- `transaction_id` - Transaction ID
- `receipt_url` - Receipt link

### 8. Organization Invitation (`organization.invitation`)
Invite a user to join an organization.

**Variables:**
- `recipient_name` - Invitee's name
- `inviter_name` - Inviter's name
- `organization_name` - Organization name
- `role_name` - Role being assigned
- `invitation_url` - Invitation acceptance link
- `expiry_days` - Invitation expiration

### 9. Payment Failed (`billing.payment_failed`)
Alert when a payment fails.

**Variables:**
- `user_name` - User's name
- `amount` - Payment amount
- `payment_method` - Payment method used
- `failure_reason` - Reason for failure
- `update_payment_url` - Link to update payment method

## Template Design

All templates feature:
- **Responsive Design** - Mobile-friendly layout
- **Modern Styling** - Gradient headers, clean typography
- **Consistent Branding** - Unified color scheme (purple gradient)
- **Clear CTAs** - Prominent call-to-action buttons
- **Info Boxes** - Highlighted important information
- **Footer Links** - Dashboard, support, unsubscribe

## Usage Examples

### Example 1: Send Welcome Email

```python
from src.notifications.service import notification_service
from src.notifications.models import SendNotificationRequest

# Send welcome email to new user
request = SendNotificationRequest(
    event_key="user.signup",
    recipient_email="newuser@example.com",
    recipient_name="Alice Johnson",
    user_id=user_id,
    template_variables={
        "user_name": "Alice Johnson",
        "user_email": "newuser@example.com",
        "created_at": "2025-10-03",
        "dashboard_url": "https://app.example.com/dashboard"
    }
)

response = await notification_service.send_notification(request)
print(f"Email sent: {response.success}")
```

### Example 2: Send Low Credit Warning

```python
from src.notifications.models import SendNotificationRequest

request = SendNotificationRequest(
    event_key="credits.low_balance",
    recipient_email="admin@company.com",
    recipient_name="Admin",
    organization_id=org_id,
    template_variables={
        "user_name": "Admin",
        "current_credits": "50",
        "organization_name": "Acme Corp",
        "purchase_credits_url": "https://app.example.com/billing/credits"
    }
)

await notification_service.send_notification(request)
```

### Example 3: Disable/Enable Notification Event

```python
from src.notifications.models import NotificationEventUpdate

# Disable an event
update = NotificationEventUpdate(is_enabled=False)
await notification_service.update_notification_event(event_id, update)

# Enable an event
update = NotificationEventUpdate(is_enabled=True)
await notification_service.update_notification_event(event_id, update)
```

### Example 4: Create Custom Template

```python
from src.notifications.models import NotificationTemplateCreate

template = NotificationTemplateCreate(
    name="Custom Onboarding",
    description="Custom onboarding email",
    subject="Welcome to {company_name}!",
    html_content="<html><body>Welcome {user_name}!</body></html>",
    from_email="hello@company.com",
    from_name="Company Name",
    template_variables=["user_name", "company_name"],
    is_active=True
)

created_template = await notification_service.create_notification_template(template)
```

## Integration with Existing Features

### Auth Module Integration

Add to `src/auth/service.py` after user signup:

```python
from src.notifications.service import notification_service
from src.notifications.models import SendNotificationRequest

async def signup(email: str, password: str, metadata: dict):
    # ... existing signup logic ...
    
    # Send welcome email
    await notification_service.send_notification(
        SendNotificationRequest(
            event_key="user.signup",
            recipient_email=email,
            recipient_name=metadata.get("name", "User"),
            user_id=user_id,
            template_variables={
                "user_name": metadata.get("name", "User"),
                "user_email": email,
                "created_at": datetime.utcnow().strftime("%Y-%m-%d"),
                "dashboard_url": "https://app.example.com/dashboard"
            }
        )
    )
```

### Billing Module Integration

Add to `src/billing/webhook_handler.py` after subscription creation:

```python
from src.notifications.service import notification_service
from src.notifications.models import SendNotificationRequest

async def handle_subscription_created(event_data):
    # ... existing logic ...
    
    # Send subscription confirmation email
    await notification_service.send_notification(
        SendNotificationRequest(
            event_key="subscription.created",
            recipient_email=user_email,
            recipient_name=user_name,
            organization_id=org_id,
            user_id=user_id,
            template_variables={
                "user_name": user_name,
                "plan_name": plan.name,
                "billing_interval": plan.interval,
                "amount": f"${plan.price_amount / 100:.2f}",
                "next_billing_date": next_billing_date,
                "included_credits": plan.included_credits,
                "billing_dashboard_url": "https://app.example.com/billing"
            }
        )
    )
```

## Testing

### Test Notification Service

```bash
cd backend
python -m pytest tests/test_notifications.py -v
```

### Manual Testing via API

1. Start the backend server
2. Use the API endpoints to:
   - Create a test notification event
   - Send a test notification
   - Check notification logs

### Test with Resend Dashboard

1. Login to [Resend Dashboard](https://resend.com/emails)
2. View sent emails and delivery status
3. Check bounce rates and errors

## Monitoring

### Key Metrics to Monitor

1. **Delivery Rate** - Percentage of successfully sent emails
2. **Failure Rate** - Percentage of failed deliveries
3. **Response Time** - Time to send notification
4. **Event Distribution** - Which events are triggered most

### Query Notification Stats

```python
stats = await notification_service.get_notification_stats(organization_id)
print(f"Total sent: {stats.total_sent}")
print(f"Total failed: {stats.total_failed}")
```

## Security Considerations

1. **API Key Protection** - Store Resend API key in environment variables
2. **Rate Limiting** - Implement rate limits on send endpoint
3. **RBAC** - Only platform admins can manage events and templates
4. **Data Privacy** - Notification logs contain PII, ensure proper access control
5. **Email Validation** - Validate recipient emails before sending

## Troubleshooting

### Email Not Sending

1. Check Resend API key is configured correctly
2. Verify event is enabled: `GET /api/notifications/admin/events`
3. Check notification logs for error messages
4. Verify sender email is verified in Resend dashboard

### Template Not Found

1. Ensure event exists in database
2. Check `event_key` matches exactly
3. Verify built-in template exists in `TEMPLATE_REGISTRY`

### Variable Not Replacing

1. Use correct variable syntax: `{variable_name}`
2. Ensure variable is passed in `template_variables`
3. Check variable name matches template definition

## Future Enhancements

- [ ] Email scheduling and delayed sending
- [ ] Batch email sending
- [ ] Email preferences per user
- [ ] A/B testing for email templates
- [ ] Email analytics and open tracking
- [ ] Multi-language support
- [ ] SMS notifications via Twilio
- [ ] Push notifications
- [ ] Webhook notifications

## Support

For issues or questions:
- Check logs: `/api/notifications/logs`
- View stats: `/api/notifications/stats`
- Health check: `/api/notifications/health`
- Resend status: [https://resend.com/status](https://resend.com/status)
