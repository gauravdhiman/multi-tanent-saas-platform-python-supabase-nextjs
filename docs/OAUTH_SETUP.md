# OAuth Provider Setup Guide

This guide explains how to configure OAuth providers like Google for your SaaS application.

## Google OAuth Setup

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (required for OAuth)

### 2. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type (or "Internal" if using Google Workspace)
3. Fill in the required application information:
   - App name: Your application name
   - User support email: Your support email
   - Developer contact information: Your email
4. Add the following scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
5. Add your domain to "Authorized domains"
6. Save the consent screen

### 3. Create OAuth Credentials

1. Navigate to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application" as the application type
4. **IMPORTANT**: For the redirect URIs, you should use the Supabase callback URL:
   - Format: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
   - Example: `https://ufyknvcmswkxowpvsazd.supabase.co/auth/v1/callback`
   - You can find this URL in your Supabase dashboard under Authentication → Settings
5. Save the credentials and note the Client ID and Client Secret

### 4. Configure Supabase OAuth Provider

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" → "Providers"
3. Find "Google" in the list and click it
4. Toggle the provider to "Enabled"
5. Enter the Google Client ID and Client Secret from step 3
6. Save the configuration

### 5. Test the Integration

1. Start your application
2. Navigate to the sign-in or sign-up page
3. Click the "Sign in with Google" or "Sign up with Google" button
4. You should be redirected to Google's OAuth screen
5. After authenticating, you should be redirected back to your application

## Other OAuth Providers

The same pattern applies to other OAuth providers supported by Supabase:
- GitHub
- Facebook
- Twitter
- Azure
- GitLab
- Bitbucket

Each provider will have its own specific setup process, but the general steps are similar:
1. Create an application in the provider's developer console
2. Obtain client credentials
3. Configure the redirect URIs to use the Supabase callback URL
4. Add the credentials to your Supabase project
5. Enable the provider

## Security Considerations

1. Always use HTTPS in production
2. Keep your OAuth credentials secure and never commit them to version control
3. Use environment variables to manage credentials
4. Regularly rotate your OAuth credentials
5. Monitor your OAuth usage for suspicious activity

## Troubleshooting

### Common Issues

1. **Redirect URI mismatch**: Ensure the redirect URIs in your OAuth provider match exactly with the Supabase callback URL
2. **OAuth consent screen not approved**: For external applications, the consent screen must be approved by Google
3. **Invalid client credentials**: Double-check that the Client ID and Secret are correct
4. **CORS errors**: Ensure your application domains are properly configured in Supabase

### Debugging Steps

1. Check the browser console for JavaScript errors
2. Verify network requests to ensure proper redirects
3. Check Supabase authentication logs
4. Review OAuth provider logs for any error messages

## How OAuth Works with Supabase

When using Supabase for OAuth authentication, the flow is handled entirely by Supabase:

1. **Frontend** calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
2. **Supabase** redirects user to Google OAuth
3. **Google** redirects back to Supabase's callback URL (e.g., `https://your-project.supabase.co/auth/v1/callback`)
4. **Supabase** handles the token exchange internally
5. **Supabase** redirects back to your application (based on `redirectTo` option or site URL)
6. **Frontend** receives the authenticated session through the auth state change listener

**Note**: You do not need to create any custom callback endpoints in your frontend or backend. Supabase handles the entire OAuth flow for you.