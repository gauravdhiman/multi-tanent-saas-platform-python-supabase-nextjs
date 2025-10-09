# Notification System - Quick Start

## 🚀 Quick Setup

### 1. Configure Environment

Add to your `.env` file:

```bash
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=SaaS Platform
```

### 2. Run Migration

```bash
alembic upgrade head
```

### 3. Seed Events

```bash
python scripts/seed_notification_events.py
```

## 📧 Send Your First Email

```python
from src.notifications.service import notification_service
from src.notifications.models import SendNotificationRequest

# Send welcome email
await notification_service.send_notification(
    SendNotificationRequest(
        event_key="user.signup",
        recipient_email="user@example.com",
        recipient_name="John Doe",
        template_variables={
            "user_name": "John Doe",
            "user_email": "user@example.com",
            "created_at": "2025-10-03",
            "dashboard_url": "https://app.example.com/dashboard"
        }
    )
)
```

## ✅ Best Practices for Using Notifications

### 1. Required Variables Validation
The system validates that all required template variables are provided:

```python
# This will raise an error if required variables are missing
try:
    await notification_service.send_notification(
        SendNotificationRequest(
            event_key="user.signup",
            recipient_email="user@example.com",
            recipient_name="John Doe",
            # Missing required variables will raise ValueError
            template_variables={
                "user_name": "John Doe"
                # Missing "user_email", "created_at", "dashboard_url" - will cause error
            }
        )
    )
except ValueError as e:
    print(f"Missing required variables: {e}")
```

### 2. XSS Protection
All template variables are automatically sanitized to prevent XSS attacks:

```python
# Even if malicious content is passed, it will be sanitized
await notification_service.send_notification(
    SendNotificationRequest(
        event_key="user.signup",
        recipient_email="user@example.com",
        recipient_name="John Doe",
        template_variables={
            "user_name": "<script>alert('XSS')</script>John",  # Will be sanitized
            "user_email": "user@example.com",
            "created_at": "2025-10-03",
            "dashboard_url": "https://app.example.com/dashboard"
        }
    )
)
```

### 3. Internal Service Integration
Use notifications within your services to trigger on business events:

```python
# In auth service after successful signup
async def signup_user(email: str, name: str):
    # ... user creation logic ...
    
    # Send welcome email
    await notification_service.send_notification(
        SendNotificationRequest(
            event_key="user.signup",
            recipient_email=email,
            recipient_name=name,
            template_variables={
                "user_name": name,
                "user_email": email,
                "created_at": datetime.now().strftime("%Y-%m-%d"),
                "dashboard_url": "https://app.example.com/dashboard"
            }
        )
    )
```

## 📋 Available Events

- `user.signup` - Welcome email
- `user.password_reset` - Password reset
- `user.email_verification` - Email verification
- `subscription.created` - Subscription activated
- `subscription.cancelled` - Subscription cancelled
- `credits.low_balance` - Low credit warning
- `credits.purchased` - Credits purchased
- `organization.invitation` - Organization invitation
- `billing.payment_failed` - Payment failed

## 🔧 Admin API Examples

### List Events
```bash
curl http://localhost:8000/api/notifications/admin/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Disable Event
```bash
curl -X PUT http://localhost:8000/api/notifications/admin/events/{event_id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": false}'
```

### Create Custom Template
```bash
curl -X POST http://localhost:8000/api/notifications/admin/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Welcome",
    "subject": "Welcome!",
    "html_content": "<html>...</html>",
    "is_active": true
  }'
```

## 📊 Health Check

```bash
curl http://localhost:8000/api/notifications/health
```

## 📚 Full Documentation

See [NOTIFICATION_SYSTEM.md](../../../docs/NOTIFICATION_SYSTEM.md) for complete documentation.

## 🎨 Email Templates

All templates feature:
- ✅ Responsive design
- ✅ Modern gradient styling
- ✅ Clear call-to-action buttons
- ✅ Professional layout

## 🔐 Security

- API keys in environment variables
- RBAC for admin endpoints
- Email validation
- Delivery logging

## 📈 Monitoring

```python
# Get stats
stats = await notification_service.get_notification_stats()
print(f"Sent: {stats.total_sent}, Failed: {stats.total_failed}")

# Get logs
logs = await notification_service.get_notification_logs(limit=10)
```

## 🛠️ Troubleshooting

**Email not sending?**
1. Check API key configuration
2. Verify event is enabled
3. Check logs: `GET /api/notifications/logs`
4. Verify sender email in Resend dashboard

**Need help?**
- Health check: `/api/notifications/health`
- View stats: `/api/notifications/stats`
- Check logs: `/api/notifications/logs`
