# Jitsi Password Authentication Removal

## Problem
The Jitsi server was requiring password authentication even though JWT token authentication had been set up. Users were seeing a password dialog when trying to join livestreams.

## Solution
Updated the Jitsi configuration to disable password authentication and rely solely on JWT tokens.

## Changes Made

### 1. Updated LiveStream Component (`src/components/LiveStream.tsx`)

**Jitsi Configuration Options:**
- Added `authenticationRequired: false` to disable authentication dialog
- Added `passwordRequired: false` to disable password requirements
- Added `anonymousUserRole: 'guest'` to allow anonymous users
- Added `guestDialOutEnabled: false` to disable guest dial-out
- Added `enableClosePage: false` to disable close page

**Interface Configuration:**
- Added `SHOW_PREJOIN_PAGE: false` to skip pre-join page
- Added `SHOW_WELCOME_PAGE: false` to skip welcome page
- Added `DISABLE_CHAT: false` to enable chat
- Added `HIDE_CHAT_BUTTON: false` to show chat button

### 2. Updated JWT Authentication Service (`src/services/jwtAuthService.ts`)

**Added JWT Token Generation Method:**
```typescript
public async generateJitsiToken(user: {
  uid: string;
  email: string;
  displayName: string;
}, roomName: string, isModerator: boolean = false): Promise<string | null>
```

This method:
- Calls the server endpoint `/api/jitsi/token`
- Generates JWT tokens for both moderators and regular users
- Handles errors gracefully

### 3. Updated Jitsi Configuration (`src/config/jitsi.ts`)

**Enhanced Configuration:**
- Added `authenticationRequired: false`
- Added `passwordRequired: false`
- Added branding configuration options
- Added JWT secret and app ID configuration

### 4. Created Test Script (`scripts/test-jitsi-jwt.js`)

**Test Features:**
- Tests JWT token generation
- Verifies token structure
- Tests different user roles (moderator vs guest)
- Provides troubleshooting guidance

## How It Works

1. **User Authentication:** Users authenticate through the app's login system
2. **JWT Token Generation:** When joining a livestream, a JWT token is generated via the server
3. **Jitsi Connection:** Jitsi uses the JWT token for authentication instead of password
4. **No Password Dialog:** Password authentication is completely disabled

## Environment Variables Required

Make sure these are set in your `.env` file:

```bash
# Jitsi JWT Configuration
REACT_APP_JITSI_DOMAIN=your-jitsi-domain.com
REACT_APP_JITSI_APP_ID=your-app-id
REACT_APP_JITSI_JWT_SECRET=your-jwt-secret

# Server Configuration
REACT_APP_API_URL=http://localhost:3001/api
```

## Testing

Run the test script to verify JWT authentication is working:

```bash
node scripts/test-jitsi-jwt.js
```

## Verification

To verify the changes are working:

1. **No Password Dialog:** Users should no longer see a password authentication dialog
2. **JWT Authentication:** Check browser console for JWT token generation logs
3. **Successful Connection:** Users should be able to join livestreams without password prompts

## Troubleshooting

If password authentication is still required:

1. **Check Jitsi Server Configuration:** Ensure your Jitsi server is configured to accept JWT tokens
2. **Verify Environment Variables:** Make sure all JWT-related environment variables are set
3. **Check Server Logs:** Look for JWT token generation errors in the server logs
4. **Browser Console:** Check for any authentication-related errors in the browser console

## Security Notes

- JWT tokens are short-lived (1 hour by default)
- Tokens are generated server-side for security
- Password authentication is completely disabled
- Only authenticated users can generate JWT tokens 