# Camera Troubleshooting Guide - 20 Second Camera Issue

## 🎯 **Problem**: Camera lights up for ~20 seconds then turns off

## 🔍 **Root Cause Analysis**

Based on the console logs, the issue is:
1. ✅ **Camera permissions granted** - Browser allows camera access
2. ❌ **Cross-origin iframe access blocked** - Cannot access Jitsi iframe content
3. ❌ **Camera disconnects after 20 seconds** - Likely due to iframe security restrictions

## 🚀 **Fixes Applied**

### **1. Removed External Camera Permission Requests**
**Problem**: Requesting camera permissions outside of Jitsi context
**Solution**: Let Jitsi handle camera permissions internally

```typescript
// Before (causing conflicts):
navigator.mediaDevices.getUserMedia({ video: true, audio: true })

// After (Jitsi handles internally):
// Camera permissions will be handled by Jitsi internally
```

### **2. Enhanced Jitsi Configuration**
**Problem**: Jitsi not properly configured for camera persistence
**Solution**: Added proper media constraints and settings

```typescript
configOverwrite: {
  // Enable pre-join page for streamers to ensure camera setup
  prejoinPageEnabled: isStreamer,
  
  // Media settings to ensure camera stays active
  constraints: {
    video: {
      aspectRatio: 16 / 9,
      height: { ideal: 720, max: 1080, min: 240 }
    }
  },
  
  // Ensure camera permissions are properly handled
  enableLayerSuspension: false,
  
  // Video quality settings
  videoQuality: {
    maxBitrate: 2500000,
    maxFramerate: 30
  }
}
```

### **3. Added Camera Recovery System**
**Problem**: No recovery mechanism when camera fails
**Solution**: Added automatic camera recovery

```typescript
// Camera error recovery
apiRef.current.addListener('cameraError', (error: any) => {
  console.error('📹 Camera error:', error);
  if (isStreamer) {
    console.log('🔄 Attempting camera recovery...');
    setTimeout(() => {
      apiRef.current?.executeCommand('toggleVideo');
    }, 3000);
  }
});
```

### **4. Enhanced Event Monitoring**
**Problem**: No visibility into camera status changes
**Solution**: Added comprehensive event listeners

```typescript
// Monitor camera status
apiRef.current.addListener('videoMuteStatusChanged', (data: any) => {
  console.log('📹 Video mute status changed:', data);
  setIsVideoMuted(data.muted);
  
  // Check video feed when camera is unmuted
  if (!data.muted && isStreamer) {
    // Verify video stream is active
  }
});
```

## 🔧 **Additional Troubleshooting Steps**

### **Step 1: Check Browser Permissions**
1. Go to browser settings
2. Check camera permissions for your domain
3. Ensure camera is not blocked or restricted

### **Step 2: Test Camera Access**
```javascript
// Run in browser console to test camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('✅ Camera access working');
    console.log('Video tracks:', stream.getVideoTracks().length);
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(error => {
    console.error('❌ Camera access failed:', error);
  });
```

### **Step 3: Check Jitsi Server Status**
```javascript
// Test Jitsi server connectivity
fetch('https://stream.biblenow.io', { mode: 'no-cors' })
  .then(() => console.log('✅ Jitsi server reachable'))
  .catch(() => console.log('❌ Jitsi server not reachable'));
```

### **Step 4: Monitor Console Logs**
Look for these key messages:
- `🎉 Video conference joined successfully`
- `🎥 Media session started`
- `📹 Video mute status changed`
- `📹 Camera error` (if any)

## 🚨 **Common Issues & Solutions**

### **Issue 1: Camera Permissions Denied**
**Symptoms**: Camera never turns on
**Solutions**:
- Allow camera permissions in browser
- Check if site is using HTTPS
- Try refreshing the page

### **Issue 2: Camera Turns Off After 20 Seconds**
**Symptoms**: Camera works briefly then stops
**Solutions**:
- Check if another app is using the camera
- Restart browser
- Try different browser
- Check camera drivers

### **Issue 3: Cross-Origin Errors**
**Symptoms**: `Cannot access iframe content` errors
**Solutions**:
- This is normal for Jitsi iframes
- Check if Jitsi is loading properly
- Verify Jitsi server is accessible

### **Issue 4: No Video Feed in Jitsi**
**Symptoms**: Camera light on but no video in Jitsi
**Solutions**:
- Check if pre-join page is working
- Verify Jitsi configuration
- Try toggling camera on/off in Jitsi

## 🧪 **Testing the Fix**

### **1. Test Camera Persistence**
1. Start a livestream as a streamer
2. Monitor console for camera events
3. Check if camera stays on for more than 20 seconds
4. Look for recovery attempts if camera fails

### **2. Test Camera Recovery**
1. If camera turns off, wait for recovery attempt
2. Check console for recovery logs
3. Verify camera comes back on

### **3. Test Different Scenarios**
- Test with different browsers
- Test with different camera devices
- Test with different network conditions

## 📊 **Expected Results After Fix**

- ✅ **Camera stays on** - No more 20-second timeout
- ✅ **Proper error handling** - Camera errors are caught and handled
- ✅ **Automatic recovery** - Camera attempts to recover from errors
- ✅ **Better logging** - Clear visibility into camera status
- ✅ **Pre-join page** - Streamers get proper camera setup

## 🆘 **If Camera Still Doesn't Work**

### **1. Check Hardware**
- Try different camera device
- Check camera drivers
- Test camera in other applications

### **2. Check Browser**
- Try different browser (Chrome, Firefox, Safari)
- Clear browser cache and cookies
- Disable browser extensions

### **3. Check Network**
- Test with different network
- Check firewall settings
- Verify Jitsi server accessibility

### **4. Check Jitsi Configuration**
- Verify Jitsi server is working
- Check JWT token generation
- Test with simple room name

## 🔄 **Manual Camera Recovery**

If automatic recovery doesn't work, try these manual steps:

```javascript
// Run in browser console
// Get Jitsi API instance
const container = document.querySelector('[data-testid="jitsi-container"]');
if (container && container._jitsiAPI) {
  const api = container._jitsiAPI;
  
  // Toggle camera off and on
  api.executeCommand('toggleVideo');
  setTimeout(() => {
    api.executeCommand('toggleVideo');
  }, 2000);
  
  console.log('🔄 Manual camera recovery attempted');
} else {
  console.log('❌ Jitsi API not found');
}
```

The enhanced system should now properly handle camera permissions within the Jitsi context and provide automatic recovery when camera issues occur.
