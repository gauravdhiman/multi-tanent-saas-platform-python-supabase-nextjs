"""
Email template definitions with beautiful HTML layouts.
"""

from config.settings import settings

# Base HTML template with modern styling
BASE_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f4f4f7;
            color: #333333;
        }}
        .email-container {{
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }}
        .email-header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
        }}
        .email-header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }}
        .email-body {{
            padding: 40px 30px;
        }}
        .email-body h2 {{
            color: #333333;
            font-size: 24px;
            margin-top: 0;
            margin-bottom: 20px;
        }}
        .email-body p {{
            color: #666666;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 15px 0;
        }}
        .cta-button {{
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }}
        .info-box {{
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .info-box p {{
            margin: 0;
        }}
        .email-footer {{
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #999999;
            font-size: 14px;
        }}
        .email-footer a {{
            color: #667eea;
            text-decoration: none;
        }}
        .divider {{
            height: 1px;
            background-color: #e0e0e0;
            margin: 30px 0;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>{app_name}</h1>
        </div>
        <div class="email-body">
            {content}
        </div>
        <div class="email-footer">
            <p>© 2025 {app_name}. All rights reserved.</p>
            <p>
                <a href="{app_url}">Visit Dashboard</a> | 
                <a href="{support_url}">Support</a> | 
                <a href="{unsubscribe_url}">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
"""


# Welcome Email Template
WELCOME_TEMPLATE = """
<h2>Welcome to {app_name}! 🎉</h2>
<p>Hi {user_name},</p>
<p>Thank you for signing up! We're excited to have you on board. Your account has been successfully created and you're ready to get started.</p>

<div class="info-box">
    <p><strong>Email:</strong> {user_email}</p>
    <p><strong>Account Created:</strong> {created_at}</p>
</div>

<p>To get started, click the button below to access your dashboard:</p>
<a href="{dashboard_url}" class="cta-button">Go to Dashboard</a>

<p>If you have any questions or need assistance, our support team is here to help!</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Password Reset Template
PASSWORD_RESET_TEMPLATE = """
<h2>Reset Your Password 🔐</h2>
<p>Hi {user_name},</p>
<p>We received a request to reset your password. Click the button below to create a new password:</p>

<a href="{reset_url}" class="cta-button">Reset Password</a>

<div class="info-box">
    <p><strong>⏰ This link will expire in {expiry_hours} hours.</strong></p>
</div>

<p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

<p>For security reasons, never share your password reset link with anyone.</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Subscription Created Template
SUBSCRIPTION_CREATED_TEMPLATE = """
<h2>Subscription Activated! 🎊</h2>
<p>Hi {user_name},</p>
<p>Great news! Your subscription has been successfully activated.</p>

<div class="info-box">
    <p><strong>Plan:</strong> {plan_name}</p>
    <p><strong>Billing Cycle:</strong> {billing_interval}</p>
    <p><strong>Amount:</strong> {amount}</p>
    <p><strong>Next Billing Date:</strong> {next_billing_date}</p>
</div>

<p><strong>Your benefits include:</strong></p>
<ul>
    <li>✓ {included_credits} credits per {billing_interval}</li>
    <li>✓ Access to all premium features</li>
    <li>✓ Priority support</li>
</ul>

<a href="{billing_dashboard_url}" class="cta-button">View Billing Details</a>

<p>Thank you for your subscription! We're committed to providing you with the best experience.</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Subscription Cancelled Template
SUBSCRIPTION_CANCELLED_TEMPLATE = """
<h2>Subscription Cancelled</h2>
<p>Hi {user_name},</p>
<p>We're sorry to see you go. Your subscription has been cancelled as requested.</p>

<div class="info-box">
    <p><strong>Plan:</strong> {plan_name}</p>
    <p><strong>Access Until:</strong> {access_until}</p>
</div>

<p>You'll continue to have access to your subscription features until {access_until}. After that, your account will revert to the free plan.</p>

<p>If you change your mind, you can reactivate your subscription at any time:</p>
<a href="{reactivate_url}" class="cta-button">Reactivate Subscription</a>

<p>We'd love to hear your feedback. If you have a moment, please let us know why you cancelled:</p>
<a href="{feedback_url}">Share Feedback</a>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Low Credits Warning Template
LOW_CREDITS_TEMPLATE = """
<h2>Low Credit Balance Warning ⚠️</h2>
<p>Hi {user_name},</p>
<p>This is a friendly reminder that your credit balance is running low.</p>

<div class="info-box">
    <p><strong>Current Balance:</strong> {current_credits} credits</p>
    <p><strong>Organization:</strong> {organization_name}</p>
</div>

<p>To avoid service interruption, we recommend purchasing additional credits or upgrading your subscription plan.</p>

<a href="{purchase_credits_url}" class="cta-button">Purchase Credits</a>

<p>Need help choosing the right plan? Our team is here to assist you!</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Credits Purchased Template
CREDITS_PURCHASED_TEMPLATE = """
<h2>Credits Purchased Successfully! 💳</h2>
<p>Hi {user_name},</p>
<p>Your credit purchase has been processed successfully.</p>

<div class="info-box">
    <p><strong>Credits Added:</strong> {credits_added}</p>
    <p><strong>Amount Paid:</strong> {amount_paid}</p>
    <p><strong>New Balance:</strong> {new_balance} credits</p>
    <p><strong>Transaction ID:</strong> {transaction_id}</p>
</div>

<a href="{receipt_url}" class="cta-button">View Receipt</a>

<p>Your credits have been added to your account and are ready to use!</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Organization Invitation Template
ORGANIZATION_INVITATION_TEMPLATE = """
<h2>You're Invited to Join an Organization! 👥</h2>
<p>Hi {recipient_name},</p>
<p><strong>{inviter_name}</strong> has invited you to join <strong>{organization_name}</strong> on {app_name}.</p>

<div class="info-box">
    <p><strong>Organization:</strong> {organization_name}</p>
    <p><strong>Role:</strong> {role_name}</p>
    <p><strong>Invited By:</strong> {inviter_name}</p>
</div>

<p>Click the button below to accept the invitation:</p>
<a href="{invitation_url}" class="cta-button">Accept Invitation</a>

<p>This invitation will expire in {expiry_days} days.</p>

<p>If you don't recognize this organization or didn't expect this invitation, you can safely ignore this email.</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Payment Failed Template
PAYMENT_FAILED_TEMPLATE = """
<h2>Payment Failed ⚠️</h2>
<p>Hi {user_name},</p>
<p>We were unable to process your recent payment. Your subscription may be affected if we can't complete the payment.</p>

<div class="info-box">
    <p><strong>Amount:</strong> {amount}</p>
    <p><strong>Payment Method:</strong> {payment_method}</p>
    <p><strong>Reason:</strong> {failure_reason}</p>
</div>

<p>Please update your payment information to avoid service interruption:</p>
<a href="{update_payment_url}" class="cta-button">Update Payment Method</a>

<p>If you need assistance, please don't hesitate to contact our support team.</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Email Verification Template
EMAIL_VERIFICATION_TEMPLATE = """
<h2>Verify Your Email Address 📧</h2>
<p>Hi {user_name},</p>
<p>Thank you for signing up! To complete your registration, please verify your email address by clicking the button below:</p>

<a href="{verification_url}" class="cta-button">Verify Email Address</a>

<div class="info-box">
    <p><strong>⏰ This link will expire in {expiry_hours} hours.</strong></p>
</div>

<p>If you didn't create an account with {app_name}, you can safely ignore this email.</p>

<p>Best regards,<br>The {app_name} Team</p>
"""


# Template registry for easy access
TEMPLATE_REGISTRY = {
    "user.signup": {
        "name": "Welcome Email",
        "subject": "Welcome to {app_name}!",
        "html_content": WELCOME_TEMPLATE,
        "variables": ["user_name", "user_email", "created_at", "dashboard_url", "app_name"]
    },
    "user.password_reset": {
        "name": "Password Reset",
        "subject": "Reset Your Password - {app_name}",
        "html_content": PASSWORD_RESET_TEMPLATE,
        "variables": ["user_name", "reset_url", "expiry_hours", "app_name"]
    },
    "user.email_verification": {
        "name": "Email Verification",
        "subject": "Verify Your Email - {app_name}",
        "html_content": EMAIL_VERIFICATION_TEMPLATE,
        "variables": ["user_name", "verification_url", "expiry_hours", "app_name"]
    },
    "subscription.created": {
        "name": "Subscription Activated",
        "subject": "Your Subscription is Active - {app_name}",
        "html_content": SUBSCRIPTION_CREATED_TEMPLATE,
        "variables": ["user_name", "plan_name", "billing_interval", "amount", "next_billing_date", "included_credits", "billing_dashboard_url", "app_name"]
    },
    "subscription.cancelled": {
        "name": "Subscription Cancelled",
        "subject": "Subscription Cancelled - {app_name}",
        "html_content": SUBSCRIPTION_CANCELLED_TEMPLATE,
        "variables": ["user_name", "plan_name", "access_until", "reactivate_url", "feedback_url", "app_name"]
    },
    "credits.low_balance": {
        "name": "Low Credit Balance",
        "subject": "Low Credit Balance Warning - {app_name}",
        "html_content": LOW_CREDITS_TEMPLATE,
        "variables": ["user_name", "current_credits", "organization_name", "purchase_credits_url", "app_name"]
    },
    "credits.purchased": {
        "name": "Credits Purchased",
        "subject": "Credits Purchase Confirmation - {app_name}",
        "html_content": CREDITS_PURCHASED_TEMPLATE,
        "variables": ["user_name", "credits_added", "amount_paid", "new_balance", "transaction_id", "receipt_url", "app_name"]
    },
    "organization.invitation": {
        "name": "Organization Invitation",
        "subject": "You're Invited to Join {organization_name} - {app_name}",
        "html_content": ORGANIZATION_INVITATION_TEMPLATE,
        "variables": ["recipient_name", "inviter_name", "organization_name", "role_name", "invitation_url", "expiry_days", "app_name"]
    },
    "billing.payment_failed": {
        "name": "Payment Failed",
        "subject": "Payment Failed - Action Required - {app_name}",
        "html_content": PAYMENT_FAILED_TEMPLATE,
        "variables": ["user_name", "amount", "payment_method", "failure_reason", "update_payment_url", "app_name"]
    }
}


def get_template_html(event_key: str, variables: dict) -> str:
    """
    Get rendered HTML for a template.
    
    Args:
        event_key: The event key for the template
        variables: Variables to inject into the template (should already include defaults)
        
    Returns:
        Rendered HTML string
    """
    template_data = TEMPLATE_REGISTRY.get(event_key)
    if not template_data:
        raise ValueError(f"Template not found for event_key: {event_key}")
        
    # Render content
    content = template_data["html_content"].format(**variables)
    
    # Prepare subject with variables
    subject = template_data["subject"].format(**variables)
    
    # Prepare variables for base template, ensuring required variables are present
    # These should already be included via validate_template_variables in the service
    base_template_vars = {
        "subject": subject,
        "content": content,
        **variables
    }
    
    # Wrap in base template
    html = BASE_TEMPLATE.format(**base_template_vars)
    
    return html
