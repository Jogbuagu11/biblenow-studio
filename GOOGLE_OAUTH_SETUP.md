# Google OAuth Setup Guide for BibleNOW Studio

This guide will help you configure Google OAuth authentication for your BibleNOW Studio application.

## Prerequisites

- Google Cloud Console account
- Supabase project set up
- BibleNOW Studio application running locally

## Step 1: Google Cloud Console Setup

### 1.1 Create or Select a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your project ID

### 1.2 Enable Required APIs
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for and enable the following APIs:
   - **Google+ API** (or **Google Identity API**)
   - **Google OAuth2 API**

### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add your domain to authorized domains
   - Save and continue through the scopes and test users sections

### 1.4 Configure OAuth Client
1. Application type: **Web application**
2. Name: `BibleNOW Studio OAuth`
3. Authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
4. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://yourdomain.com/auth/callback` (for production)
   - `https://your-supabase-project.supabase.co/auth/v1/callback` (Supabase callback)

### 1.5 Get Your Credentials
1. After creating the OAuth client, you'll get:
   - **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abcdefghijklmnop`)

## Step 2: Supabase Configuration

### 2.1 Update Supabase Config
The Supabase configuration has already been updated in `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
```

### 2.2 Set Environment Variables
Add these to your `.env` file:

```bash
# Google OAuth Configuration (for Supabase)
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-google-oauth-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-google-oauth-client-secret
```

Replace the placeholder values with your actual Google OAuth credentials.

## Step 3: Frontend Implementation

The frontend has been updated with Google OAuth support:

### 3.1 Landing Page
- Added Google login button with proper styling
- Integrated with authentication store
- Shows loading state during authentication

### 3.2 Login Page
- Added Google login option below the email/password form
- Includes proper divider and styling
- Handles loading states and errors

### 3.3 Authentication Store
- Added `loginWithGoogle()` method
- Added OAuth callback handling
- Integrated with Supabase auth state management

## Step 4: Testing the Integration

### 4.1 Start Your Application
```bash
# Start Supabase locally
supabase start

# Start your React application
npm start
```

### 4.2 Test Google Login
1. Navigate to your application at `http://localhost:3000`
2. Click the "Login with Google" button on the landing page
3. Or go to `/login` and click "Continue with Google"
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you should be redirected back to your dashboard

### 4.3 Verify Authentication
- Check that the user is properly authenticated
- Verify user data is stored in your Supabase auth tables
- Test logout functionality

## Step 5: Production Deployment

### 5.1 Update Redirect URIs
When deploying to production:
1. Update your Google OAuth client settings
2. Add your production domain to authorized origins and redirect URIs
3. Update your Supabase project settings for production URLs

### 5.2 Environment Variables
Make sure to set the production environment variables:
```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-production-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-production-client-secret
```

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**
   - Ensure your redirect URIs in Google Console match exactly
   - Include both localhost and production URLs

2. **"invalid_client" Error**
   - Check that your Client ID and Secret are correct
   - Ensure they're properly set in environment variables

3. **"access_denied" Error**
   - Check OAuth consent screen configuration
   - Ensure your domain is authorized

4. **Supabase Auth Errors**
   - Verify Supabase is running locally
   - Check that Google OAuth is enabled in Supabase config
   - Ensure environment variables are loaded correctly

### Debug Steps

1. Check browser console for errors
2. Verify environment variables are loaded:
   ```javascript
   console.log('Google Client ID:', process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID);
   ```
3. Check Supabase logs for authentication errors
4. Verify Google OAuth client configuration

## Security Considerations

1. **Never commit OAuth secrets to version control**
2. **Use environment variables for all sensitive data**
3. **Regularly rotate OAuth credentials**
4. **Monitor OAuth usage in Google Console**
5. **Implement proper error handling and logging**

## Next Steps

After successful setup:
1. Test the complete authentication flow
2. Implement user profile management
3. Add proper error handling and user feedback
4. Consider adding other OAuth providers (GitHub, Facebook, etc.)
5. Implement proper session management and security

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Google OAuth documentation
3. Check Supabase authentication documentation
4. Verify your environment configuration

---

**Note**: This setup uses Supabase's built-in OAuth handling, which simplifies the implementation but requires proper configuration of both Google Cloud Console and Supabase.
