# Private Jitsi JWT Authentication Setup

## 🔐 JWT Authentication Requirements

Your private hosted Jitsi development environment requires JWT authentication parameters and secret keys. Here's how to set it up:

## 📋 Required Environment Variables

Add these to your `.env` file:

```bash
# Jitsi JWT Configuration
REACT_APP_JITSI_DOMAIN=your-private-jitsi-domain.com
REACT_APP_JITSI_APP_ID=your-app-id
REACT_APP_JITSI_JWT_SECRET=your-jwt-secret-key
REACT_APP_JITSI_AUDIENCE=your-app-id
REACT_APP_JITSI_ISSUER=your-app-id

# Optional: Custom branding
REACT_APP_JITSI_BRANDING_ROOM_ALIAS=BibleNOW Studio
REACT_APP_JITSI_BRANDING_ROOM_NAME=BibleNOW Studio
REACT_APP_JITSI_BRANDING_ROOM_SUBTITLE=Live Ministry Stream
```

## 🛠️ Configuration Updates

### 1. Update JWT Config (`src/config/jwt.ts`)

```typescript
// JWT Configuration for Private Jitsi
export const jwtConfig = {
  // JWT Secret for signing tokens
  secret: process.env.REACT_APP_JITSI_JWT_SECRET || null,
  
  // Token expiration time (in seconds)
  expiresIn: 3600, // 1 hour
  
  // Algorithm to use for signing
  algorithm: 'HS256' as const,
  
  // Private Jitsi App ID (audience and issuer)
  audience: process.env.REACT_APP_JITSI_AUDIENCE || process.env.REACT_APP_JITSI_APP_ID,
  issuer: process.env.REACT_APP_JITSI_ISSUER || process.env.REACT_APP_JITSI_APP_ID,
  
  // Room name prefix for moderator rooms
  roomPrefix: 'moderator-',
  
  // User roles that can generate moderator tokens
  moderatorRoles: ['moderator', 'admin'] as const
};
```

### 2. Update Jitsi Config (`src/config/jitsi.ts`)

```typescript
// Private Jitsi configuration
export const jitsiConfig = {
  domain: process.env.REACT_APP_JITSI_DOMAIN || "meet.jit.si",
  appId: process.env.REACT_APP_JITSI_APP_ID || "your-app-id",
  jwtSecret: process.env.REACT_APP_JITSI_JWT_SECRET || null,
  
  // Branding configuration
  branding: {
    roomAlias: process.env.REACT_APP_JITSI_BRANDING_ROOM_ALIAS || 'BibleNOW Studio',
    roomName: process.env.REACT_APP_JITSI_BRANDING_ROOM_NAME || 'BibleNOW Studio',
    roomSubtitle: process.env.REACT_APP_JITSI_BRANDING_ROOM_SUBTITLE || 'Live Ministry Stream',
  }
};
```

### 3. Update LiveStream Component

In `src/components/LiveStream.tsx`, update the Jitsi initialization:

```typescript
// Generate JWT token for private Jitsi
let jwtToken = null;
let isModerator = false;

if (user && jwtConfig.secret) {
  try {
    const jwtAuthService = new JWTAuthService();
    jwtToken = await jwtAuthService.generateModeratorToken(
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'BibleNOW User'
      },
      formattedRoomName
    );
    isModerator = true;
  } catch (error) {
    console.error('Error generating JWT token:', error);
  }
}

// Jitsi options for private hosted instance
const options: any = {
  roomName: formattedRoomName,
  parentNode: containerRef.current,
  width: "100%",
  height: "100%",
  
  // Private Jitsi configuration
  domain: jitsiConfig.domain,
  userInfo: {
    displayName: user?.displayName || "BibleNOW Studio User",
    email: user?.email || "user@biblenowstudio.com",
    avatar: userAvatar
  },
  
  // JWT authentication
  ...(jwtToken && { jwt: jwtToken }),
  
  // Room settings
  configOverwrite: {
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    prejoinPageEnabled: false,
    disableModeratorIndicator: false,
    startAudioOnly: false,
    guestDialOutEnabled: false,
    guestDialOutUrl: "",
    enableClosePage: false,
    
    // Authentication settings
    anonymousUserRole: isModerator ? 'moderator' : 'guest',
    authenticationRequired: isModerator,
    
    // Branding configuration
    brandingRoomAlias: jitsiConfig.branding.roomAlias,
    brandingRoomName: jitsiConfig.branding.roomName,
    brandingRoomSubtitle: jitsiConfig.branding.roomSubtitle,
    disableBranding: false,
  },
  
  interfaceConfigOverwrite: {
    TOOLBAR_BUTTONS: [
      'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
      'fodeviceselection', 'hangup', 'chat', 'recording',
      'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
      'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
      'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone-else'
    ],
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    SHOW_POWERED_BY: false,
    SHOW_BRAND_WATERMARK: false,
    SHOW_PROMOTIONAL_CLOSE_PAGE: false,
    DISABLE_CHAT: true,
    HIDE_CHAT_BUTTON: true,
    
    // Branding properties
    APP_NAME: 'BibleNOW Studio',
    NATIVE_APP_NAME: 'BibleNOW Studio',
    PROVIDER_NAME: 'BibleNOW Studio',
    PRIMARY_COLOR: '#D97706',
    BRAND_COLOR: '#D97706',
    
    // Interface settings
    TOOLBAR_ALWAYS_VISIBLE: true,
    SHOW_PREJOIN_PAGE: false,
    SHOW_WELCOME_PAGE: true,
  }
};
```

## 🔑 Getting Your JWT Credentials

### For Private Hosted Jitsi:

1. **Contact your Jitsi administrator** to get:
   - `REACT_APP_JITSI_DOMAIN` - Your private Jitsi server domain
   - `REACT_APP_JITSI_APP_ID` - Your application ID
   - `REACT_APP_JITSI_JWT_SECRET` - Your JWT signing secret

2. **JWT Secret Requirements**:
   - Must be a strong, random string (at least 32 characters)
   - Should be kept secure and not shared
   - Used to sign and verify JWT tokens

3. **App ID Format**:
   - Usually follows pattern: `your-org/your-app`
   - Example: `biblenow/studio-app`

## 🧪 Testing JWT Authentication

### 1. Test JWT Generation

```typescript
// Test in browser console
const jwtAuthService = new JWTAuthService();
const token = await jwtAuthService.generateModeratorToken(
  {
    uid: 'test-user-id',
    email: 'test@biblenowstudio.com',
    displayName: 'Test User'
  },
  'test-room'
);
console.log('JWT Token:', token);
```

### 2. Test JWT Verification

```typescript
// Verify the token
const decoded = jwtAuthService.verifyToken(token);
console.log('Decoded JWT:', decoded);
```

### 3. Test Jitsi Connection

1. Start a livestream with JWT authentication
2. Check browser console for JWT-related logs
3. Verify user has moderator permissions in the room

## 🚨 Common Issues

### Issue 1: "JWT secret not configured"
**Solution**: Ensure `REACT_APP_JITSI_JWT_SECRET` is set in your `.env` file

### Issue 2: "Invalid JWT token"
**Solution**: 
- Verify your JWT secret matches the server configuration
- Check that audience and issuer match your app ID
- Ensure token hasn't expired

### Issue 3: "Authentication required"
**Solution**: 
- Verify user is authenticated with Supabase
- Check that JWT token is being generated correctly
- Ensure user has moderator role if required

## 🔄 Migration to Self-Hosted

When you switch back to self-hosted Jitsi:

1. **Update domain**: Change `REACT_APP_JITSI_DOMAIN` to your self-hosted URL
2. **Update JWT config**: Use your self-hosted JWT settings
3. **Test authentication**: Verify JWT tokens work with your instance
4. **Update branding**: Configure custom branding for your domain

## 📋 Quick Setup Checklist

- [ ] **Environment Variables**: Set all JWT-related variables
- [ ] **JWT Config**: Updated for private Jitsi domain
- [ ] **LiveStream Component**: Updated with JWT authentication
- [ ] **JWT Secret**: Obtained from Jitsi administrator
- [ ] **Testing**: JWT generation and verification working
- [ ] **Branding**: Custom branding configured
- [ ] **Error Handling**: Proper error handling for JWT failures

This setup ensures your private hosted Jitsi development environment works with proper JWT authentication while maintaining the same user experience as your production self-hosted setup. 