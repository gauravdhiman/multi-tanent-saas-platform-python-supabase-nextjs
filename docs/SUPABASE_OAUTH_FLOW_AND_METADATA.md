# Supabase OAuth Flow and User Metadata

## Complete OAuth Flow Explanation

### 1. OAuth Flow Steps

1. **User Initiates OAuth**: User clicks "Sign in with Google/GitHub" button
2. **Redirect to OAuth Provider**: Browser redirects to OAuth provider (Google/GitHub)
3. **User Authenticates**: User enters credentials at OAuth provider
4. **OAuth Provider Redirect**: OAuth provider redirects back to Supabase-hosted callback URL
5. **Supabase Processes**: Supabase receives OAuth response and creates/updates user
6. **Supabase Redirects**: Supabase redirects to your application callback URL
7. **Application Processes**: Your app retrieves user metadata and completes setup

### 2. Detailed Supabase Processing

When OAuth provider redirects back to Supabase:

**URL Pattern**: `https://your-project.supabase.co/auth/v1/callback`

**What Supabase Does**:
1. **Receives OAuth Response**: Gets access token, user info, etc. from OAuth provider
2. **Extracts User Data**: Pulls user information from OAuth provider's response
3. **Checks Existing User**: Looks up if user already exists by email/provider_id
4. **Creates/Updates User**: 
   - If new user: Creates user record in `auth.users`
   - If existing user: Updates last login timestamp
5. **Stores Metadata**: Saves user info in `raw_user_meta_data` JSON column
6. **Sets Session**: Creates auth session/cookies
7. **Redirects**: Sends user to your configured redirect URL

### 3. OAuth Provider Data Mapping

#### Google OAuth Provider:
```
{
  "sub": "123456789",           // Provider user ID
  "name": "John Doe",           // Full name
  "given_name": "John",         // First name
  "family_name": "Doe",         // Last name
  "picture": "https://...",     // Profile picture
  "email": "john@example.com",
  "email_verified": true,
  "locale": "en"
}
```

#### GitHub OAuth Provider:
```
{
  "id": 123456789,              // Provider user ID
  "login": "johndoe",           // Username
  "name": "John Doe",           // Full name (may be null)
  "email": "john@example.com",
  "avatar_url": "https://...",  // Profile picture
  "bio": "Developer bio"
}
```

#### Supabase Metadata Mapping:
```
user_metadata: {
  "sub": "123456789",           // From Google
  "name": "John Doe",           // From Google/GitHub
  "given_name": "John",         // From Google
  "family_name": "Doe",         // From Google
  "full_name": "John Doe",      // Supabase-added from name
  "picture": "https://...",     // From Google/GitHub
  "avatar_url": "https://...",  // From GitHub
  "email": "john@example.com",
  "email_verified": true,
  "provider_id": "google",      // Provider identifier
  "providers": ["google"]        // List of linked providers
}
```

### 4. How to View User Metadata in Supabase

#### Method 1: Supabase Dashboard (Limited)
1. Go to Supabase Dashboard → Authentication → Users
2. Click on a specific user
3. You'll see basic info but metadata is often truncated

#### Method 2: SQL Query in Dashboard
```sql
-- View all user metadata (requires super admin access)
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at,
    last_sign_in_at
FROM auth.users;

-- View specific user metadata
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'given_name' as first_name,
    raw_user_meta_data->>'family_name' as last_name,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'picture' as picture
FROM auth.users 
WHERE email = 'user@example.com';

-- Pretty-print JSON metadata
SELECT 
    id,
    email,
    jsonb_pretty(raw_user_meta_data) as metadata
FROM auth.users 
WHERE id = 'USER_UUID_HERE';
```

#### Method 3: Using Supabase Admin API (Recommended)
```python
from supabase import create_client

# Using service key (admin access)
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Get all users with metadata
response = supabase.auth.admin.list_users()
for user in response.users:
    print(f"Email: {user.email}")
    print(f"Metadata: {user.user_metadata}")
    print("---")

# Get specific user
user_response = supabase.auth.admin.get_user_by_id("USER_ID")
print(f"User metadata: {user_response.user.user_metadata}")
```

### 5. How Supabase Ensures Correct Metadata Saving

#### Data Validation:
1. **Schema Validation**: Supabase validates incoming OAuth data structure
2. **Field Mapping**: Maps provider-specific fields to standard metadata fields
3. **Data Sanitization**: Cleans and sanitizes user data before storage
4. **Conflict Resolution**: Handles conflicts between existing and new data

#### Error Handling:
1. **Fallback Mechanisms**: If primary name field missing, tries alternatives
2. **Partial Data Support**: Stores whatever data is available
3. **Logging**: Logs errors and warnings for debugging

#### Example Mapping Logic:
```python
# Pseudocode for Supabase's metadata processing
def process_oauth_user_data(oauth_data, provider):
    metadata = {}
    
    # Handle Google-specific fields
    if provider == "google":
        metadata["full_name"] = oauth_data.get("name")
        metadata["first_name"] = oauth_data.get("given_name")
        metadata["last_name"] = oauth_data.get("family_name")
        metadata["picture"] = oauth_data.get("picture")
        
    # Handle GitHub-specific fields
    elif provider == "github":
        metadata["full_name"] = oauth_data.get("name")
        metadata["username"] = oauth_data.get("login")
        metadata["avatar_url"] = oauth_data.get("avatar_url")
        
    # Add common fields
    metadata["email"] = oauth_data.get("email")
    metadata["email_verified"] = oauth_data.get("email_verified", False)
    metadata["provider_id"] = provider
    
    return metadata
```

### 6. Viewing Metadata in Practice

#### In Your Application OAuth Callback:
```typescript
// frontend/src/app/auth/oauth/callback/page.tsx
useEffect(() => {
  const handleOAuthCallback = async () => {
    // At this point, Supabase has already:
    // 1. Received OAuth response
    // 2. Created/updated user record
    // 3. Stored metadata in auth system
    // 4. Set session cookies
    
    // We just retrieve the already-created user
    const currentUser = await supabase.auth.getUser();
    if (currentUser.data?.user) {
      const userMetadata = currentUser.data.user.user_metadata || {};
      console.log("User Metadata:", userMetadata);
      // This metadata was set by Supabase during OAuth processing
      
      // Extract names using our utility function
      const { firstName, lastName } = extractFirstLastName(userMetadata);
    }
  };
}, []);
```

### 7. Common Issues and Solutions

#### Issue: Missing Name Fields
**Cause**: Some OAuth providers don't provide structured name data
**Solution**: Supabase falls back to `full_name` or `name` fields and splits them

#### Issue: Inconsistent Field Names
**Cause**: Different providers use different field names
**Solution**: Supabase maps provider-specific fields to standard metadata fields

#### Issue: Partial Data
**Cause**: Users may not have filled all profile fields
**Solution**: Supabase stores whatever data is available and leaves missing fields empty

### 8. Best Practices for Metadata Handling

1. **Always Use Utility Functions**: Use `extract_first_last_name()` for consistent name extraction
2. **Handle Missing Data**: Gracefully handle cases where metadata fields are missing
3. **Fallback Chains**: Implement proper fallback chains (first_name/last_name → full_name → name)
4. **Data Validation**: Validate extracted data before using it
5. **Logging**: Log metadata extraction for debugging purposes

This comprehensive approach ensures that user metadata is properly handled regardless of how users sign up or what data OAuth providers make available.
