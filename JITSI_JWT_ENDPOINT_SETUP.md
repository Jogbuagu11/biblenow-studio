# Jitsi JWT Endpoint Setup

## 🔧 **Express Implementation**

The Jitsi JWT endpoint is implemented in `server/index.js` at `/api/jitsi/token`.

## 📋 **Environment Variables**

### **Required Variables**

```bash
# JWT Secret (REQUIRED)
JITSI_JWT_SECRET=your_very_strong_secret_key_here_minimum_32_chars

# JWT Claims (OPTIONAL - defaults provided)
JITSI_AUD=biblenow
JITSI_ISS=biblenow
JITSI_SUB=stream.biblenow.io  # Optional tenant claim
JITSI_JWT_ALGORITHM=HS256     # HS256 (default) or RS256
```

### **CORS Configuration**

The endpoint allows these origins:
- `https://studio.biblenow.io`
- `https://biblenow.io`
- `https://stream.biblenow.io`
- `https://live.biblenow.io`
- `http://localhost:3000`

## 🚀 **API Endpoint**

### **POST /api/jitsi/token**

**Request Body:**
```json
{
  "room": "string (required)",
  "moderator": "boolean (optional, default: false)",
  "name": "string (optional)",
  "email": "string (optional)"
}
```

**Response (200):**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "room": "test-room",
  "expires": 1756085191
}
```

**Error Response (400/500):**
```json
{
  "error": "Error message",
  "hint": "Helpful hint for debugging"
}
```

## 🧪 **Testing**

### **Local Testing**
```bash
# Test local endpoint
node scripts/test-jitsi-endpoint.js

# Manual curl test
curl -X POST http://localhost:3001/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d '{
    "room": "test-room",
    "name": "Test User",
    "email": "test@biblenowstudio.com",
    "moderator": false
  }'
```

### **Production Testing**
```bash
# Test production endpoint
curl -X POST https://biblenow-studio-backend.onrender.com/api/jitsi/token \
  -H "Content-Type: application/json" \
  -d '{
    "room": "test-room",
    "name": "Test User",
    "email": "test@biblenowstudio.com",
    "moderator": false
  }'
```

## 🔐 **JWT Token Structure**

The generated JWT contains:

```json
{
  "aud": "biblenow",
  "iss": "biblenow",
  "sub": "stream.biblenow.io",  // Only if JITSI_SUB is set
  "room": "test-room",
  "nbf": 1756081586,           // now - 10s
  "exp": 1756085191,           // now + 1h
  "iat": 1756081591,           // now
  "context": {
    "user": {
      "name": "Test User",
      "email": "test@biblenowstudio.com",
      "moderator": false
    }
  }
}
```

## 🚀 **Deployment**

### **Render Deployment**

1. **Set Environment Variables** in Render dashboard:
   ```bash
   JITSI_JWT_SECRET=your_actual_secret_here
   JITSI_AUD=biblenow
   JITSI_ISS=biblenow
   JITSI_SUB=stream.biblenow.io
   ```

2. **Deploy** your server to Render

3. **Test** the endpoint:
   ```bash
   curl -X POST https://biblenow-studio-backend.onrender.com/api/jitsi/token \
     -H "Content-Type: application/json" \
     -d '{"room": "test"}'
   ```

## 🔧 **Frontend Integration**

The frontend should call the endpoint like this:

```typescript
const response = await fetch('https://biblenow-studio-backend.onrender.com/api/jitsi/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    room: roomName,
    moderator: isModerator,
    name: user.displayName,
    email: user.email
  })
});

const data = await response.json();
const jwtToken = data.jwt; // Use this token in Jitsi iframe
```

## 🐛 **Troubleshooting**

### **404 Error**
- Check if the endpoint is deployed to Render
- Verify the URL is correct
- Check server logs for deployment issues

### **CORS Error**
- Verify your frontend domain is in the allowed origins
- Check if the request includes proper headers

### **JWT Signing Error**
- Verify `JITSI_JWT_SECRET` is set
- Check if the secret is valid
- Ensure algorithm is supported (HS256/RS256)

### **Authentication Still Required**
- The Jitsi server itself needs to be configured to accept JWT tokens
- This endpoint only generates valid JWT tokens
- Server-side Jitsi configuration is required for JWT-only auth 