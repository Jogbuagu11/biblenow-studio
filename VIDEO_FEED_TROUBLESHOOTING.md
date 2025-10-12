# Video Feed Troubleshooting Guide

## 🎯 **Problem**: Black video feed in livestream

## 🔍 **Debugging Steps**

### **Step 1: Run Browser Console Debug Script**

1. Open your livestream page
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Copy and paste the contents of `debug_video_feed.js` into the console
5. Press Enter to run the debug script

This will check:
- ✅ Jitsi script loading
- ✅ Iframe creation and dimensions
- ✅ Camera/microphone permissions
- ✅ Network connectivity
- ✅ Jitsi configuration
- ✅ Video elements

### **Step 2: Check Enhanced Console Logs**

The LiveStream component now has enhanced debugging. Look for these logs:

```
🎥 Starting Jitsi initialization with enhanced debugging...
📊 Initialization parameters: {...}
📐 Container dimensions: {...}
🔧 Creating Jitsi API instance with enhanced debugging...
✅ Jitsi instance created successfully
📐 Iframe details: {...}
✅ Jitsi iframe loaded successfully
📹 Video elements found in iframe: X
```

### **Step 3: Common Issues & Solutions**

#### **Issue 1: Jitsi Script Not Loaded**
**Symptoms**: `❌ Jitsi script not found` or `❌ JitsiMeetExternalAPI is not available`

**Solutions**:
1. Check if Jitsi script is included in your HTML
2. Verify the script URL is correct
3. Check for network connectivity issues

#### **Issue 2: Container Dimensions**
**Symptoms**: Container width/height is 0

**Solutions**:
1. Ensure the container has proper CSS dimensions
2. Check if the container is visible (display: none)
3. Verify the container is in the DOM

#### **Issue 3: Camera/Microphone Permissions**
**Symptoms**: `❌ Media permissions error`

**Solutions**:
1. Allow camera/microphone permissions in browser
2. Check if site is using HTTPS (required for media access)
3. Try refreshing the page and allowing permissions again

#### **Issue 4: JWT Token Issues**
**Symptoms**: `❌ JWT token not found in iframe`

**Solutions**:
1. Check if JWT token is being generated correctly
2. Verify the token endpoint is working
3. Check for authentication issues

#### **Issue 5: Iframe Cross-Origin Issues**
**Symptoms**: `⚠️ Cannot access iframe content (cross-origin)`

**Solutions**:
1. This is normal for Jitsi iframes
2. Check if the iframe is loading properly
3. Verify the Jitsi server is accessible

#### **Issue 6: No Video Elements**
**Symptoms**: `❌ No video elements found in iframe`

**Solutions**:
1. Wait longer for Jitsi to initialize (try 5-10 seconds)
2. Check if camera permissions are granted
3. Verify the room name is correct
4. Check if the Jitsi server is working

### **Step 4: Manual Debugging Commands**

Run these commands in the browser console:

```javascript
// Check Jitsi API instance
const container = document.querySelector('[data-testid="jitsi-container"]');
if (container && container._jitsiAPI) {
  console.log('Jitsi API state:', container._jitsiAPI.getState());
} else {
  console.log('No Jitsi API instance found');
}

// Check iframe
const iframe = document.querySelector('iframe[src*="jitsi"]');
if (iframe) {
  console.log('Iframe src:', iframe.src);
  console.log('Iframe dimensions:', iframe.offsetWidth, 'x', iframe.offsetHeight);
} else {
  console.log('No iframe found');
}

// Check video elements
const videos = document.querySelectorAll('video');
console.log('Video elements found:', videos.length);
videos.forEach((video, index) => {
  console.log(`Video ${index}:`, {
    src: video.src,
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight
  });
});
```

### **Step 5: Network Debugging**

1. Open Network tab in Developer Tools
2. Look for failed requests to:
   - `stream.biblenow.io`
   - Jitsi-related endpoints
   - JWT token endpoints

3. Check for CORS errors or 404/500 responses

### **Step 6: Jitsi Server Status**

Test if the Jitsi server is accessible:

```javascript
// Test Jitsi server connectivity
fetch('https://stream.biblenow.io', { mode: 'no-cors' })
  .then(() => console.log('✅ Jitsi server is reachable'))
  .catch(() => console.log('❌ Jitsi server is not reachable'));
```

## 🚀 **Quick Fixes to Try**

### **Fix 1: Refresh and Allow Permissions**
1. Refresh the page
2. Allow camera/microphone when prompted
3. Check if video appears

### **Fix 2: Check HTTPS**
- Ensure you're using HTTPS (required for camera access)
- If on localhost, try using `https://localhost:3000`

### **Fix 3: Clear Browser Cache**
1. Clear browser cache and cookies
2. Refresh the page
3. Allow permissions again

### **Fix 4: Try Different Browser**
- Test in Chrome, Firefox, or Safari
- Some browsers have different permission handling

### **Fix 5: Check Room Name**
- Verify the room name in the URL is correct
- Try a simple room name like "test-room"

## 📊 **Debug Output Interpretation**

### **Good Signs** ✅
- `✅ Jitsi script found`
- `✅ JitsiMeetExternalAPI is available`
- `✅ Jitsi container found`
- `✅ Jitsi iframe found`
- `✅ Camera and microphone permissions granted`
- `✅ Jitsi iframe loaded successfully`
- `📹 Video elements found in iframe: X`

### **Bad Signs** ❌
- `❌ Jitsi script not found`
- `❌ JitsiMeetExternalAPI is not available`
- `❌ Jitsi container not found`
- `❌ Jitsi iframe not found`
- `❌ Media permissions error`
- `❌ Iframe failed to load`
- `❌ No video elements found in iframe`

## 🆘 **If Nothing Works**

1. **Check the console for any error messages**
2. **Try the debug script in a different browser**
3. **Test with a simple room name**
4. **Verify your Jitsi server configuration**
5. **Check if other users can see your video**

## 📞 **Getting Help**

When reporting issues, include:
1. Browser and version
2. Console debug output
3. Network tab errors
4. Steps to reproduce
5. Screenshots of the black video area
