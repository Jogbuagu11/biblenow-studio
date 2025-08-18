# Live Proxy Fix for Mojibake Issue

## Problem
The `/live` routes were showing binary/gzipped content rendered as text (mojibake) in the DOM. This was happening because:

1. The React app was trying to handle `/live` routes through client-side routing
2. Binary content from the upstream server was being treated as text
3. Gzip compression was causing the response to be unreadable when rendered as text

## Solution
Added server-side proxy routes that:

1. **Disable gzip compression** by setting `Accept-Encoding: ""` header
2. **Properly forward content-type headers** to ensure correct rendering
3. **Stream responses** to prevent memory issues
4. **Add comprehensive logging** for debugging

## Changes Made

### 1. Server Proxy Routes (`server/index.js`)
- Added `/live/:room` route that proxies to `https://studio.biblenow.io/live?room={room}`
- Added `/live` route for bare live requests
- Both routes disable gzip compression and properly forward headers

### 2. Dependencies
- Added `node-fetch@2` to server dependencies for making HTTP requests

### 3. Test Script
- Created `scripts/test-live-proxy.js` to verify the fix works

## Deployment Steps

### 1. Deploy Server Changes
```bash
# Navigate to server directory
cd server

# Install new dependency
npm install node-fetch@2

# Test locally
npm run dev

# Deploy to your hosting platform
# (Vercel, Render, etc.)
```

### 2. Test the Fix
```bash
# Run the test script
node scripts/test-live-proxy.js

# Or test manually by visiting:
# https://your-domain.com/live/test-room
```

### 3. Verify in Browser
1. Open browser DevTools
2. Navigate to `/live/some-room`
3. Check Network tab for the request
4. Verify response headers show no `Content-Encoding: gzip`
5. Verify the page renders properly without mojibake

## Expected Behavior

### Before Fix
- `/live/room-name` would show gibberish characters
- Response headers would include `Content-Encoding: gzip`
- Binary content rendered as text in DOM

### After Fix
- `/live/room-name` should render the proper live stream page
- Response headers should NOT include `Content-Encoding: gzip`
- Content should be properly decoded and rendered

## Troubleshooting

### If mojibake still appears:
1. Check server logs for proxy errors
2. Verify the proxy routes are being hit (look for "Proxying /live" logs)
3. Check if the upstream URL is correct
4. Ensure `node-fetch` is properly installed

### If proxy isn't working:
1. Check that the server is running
2. Verify the routes are defined before the catch-all route
3. Check for any middleware conflicts

### If you see 404 errors:
1. Ensure the proxy routes are defined before the `app.get('*')` catch-all
2. Check that the server is properly deployed with the new code

## Monitoring

The proxy includes comprehensive logging:
- Request URLs being proxied
- Response status codes
- Content-type headers
- Any errors during proxying

Check your server logs to monitor the proxy performance and catch any issues early. 