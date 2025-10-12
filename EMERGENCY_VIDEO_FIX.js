// EMERGENCY VIDEO FEED FIX
// Run this in browser console to diagnose and fix video feed issues

console.log('🚨 EMERGENCY VIDEO FEED DIAGNOSIS STARTING...');

// Step 1: Check if Jitsi is loaded
function checkJitsiLoaded() {
  console.log('🔍 Step 1: Checking Jitsi loading...');
  
  if (window.JitsiMeetExternalAPI) {
    console.log('✅ JitsiMeetExternalAPI is loaded');
    return true;
  } else {
    console.error('❌ JitsiMeetExternalAPI is NOT loaded');
    return false;
  }
}

// Step 2: Check if Jitsi container exists
function checkJitsiContainer() {
  console.log('🔍 Step 2: Checking Jitsi container...');
  
  const container = document.querySelector('[data-testid="jitsi-container"]');
  if (container) {
    console.log('✅ Jitsi container found');
    console.log('Container dimensions:', {
      width: container.offsetWidth,
      height: container.offsetHeight,
      display: getComputedStyle(container).display
    });
    return container;
  } else {
    console.error('❌ Jitsi container NOT found');
    return null;
  }
}

// Step 3: Check if Jitsi iframe exists
function checkJitsiIframe(container) {
  console.log('🔍 Step 3: Checking Jitsi iframe...');
  
  if (!container) {
    console.error('❌ No container to check iframe');
    return null;
  }
  
  const iframe = container.querySelector('iframe');
  if (iframe) {
    console.log('✅ Jitsi iframe found');
    console.log('Iframe details:', {
      src: iframe.src,
      width: iframe.offsetWidth,
      height: iframe.offsetHeight,
      display: getComputedStyle(iframe).display,
      visibility: getComputedStyle(iframe).visibility
    });
    return iframe;
  } else {
    console.error('❌ Jitsi iframe NOT found');
    return null;
  }
}

// Step 4: Check if Jitsi API instance exists
function checkJitsiAPI(container) {
  console.log('🔍 Step 4: Checking Jitsi API instance...');
  
  if (!container) {
    console.error('❌ No container to check API');
    return null;
  }
  
  if (container._jitsiAPI) {
    console.log('✅ Jitsi API instance found');
    
    try {
      const state = container._jitsiAPI.getState();
      console.log('Jitsi state:', state);
      return container._jitsiAPI;
    } catch (error) {
      console.error('❌ Error getting Jitsi state:', error);
      return null;
    }
  } else {
    console.error('❌ Jitsi API instance NOT found');
    return null;
  }
}

// Step 5: Check camera permissions
async function checkCameraPermissions() {
  console.log('🔍 Step 5: Checking camera permissions...');
  
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'camera' });
    console.log('Camera permission status:', permissionStatus.state);
    
    if (permissionStatus.state === 'denied') {
      console.error('❌ Camera permission DENIED');
      return false;
    } else if (permissionStatus.state === 'prompt') {
      console.warn('⚠️ Camera permission not yet requested');
    } else {
      console.log('✅ Camera permission granted');
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Could not check camera permissions:', error);
    return true; // Assume it's working
  }
}

// Step 6: Test camera access
async function testCameraAccess() {
  console.log('🔍 Step 6: Testing camera access...');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }, 
      audio: true 
    });
    
    console.log('✅ Camera access successful');
    console.log('Video tracks:', stream.getVideoTracks().length);
    console.log('Audio tracks:', stream.getAudioTracks().length);
    
    // Check video track details
    stream.getVideoTracks().forEach((track, index) => {
      console.log(`Video track ${index}:`, {
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings()
      });
    });
    
    // Stop the test stream
    stream.getTracks().forEach(track => track.stop());
    console.log('🛑 Test stream stopped');
    
    return true;
  } catch (error) {
    console.error('❌ Camera access failed:', error);
    return false;
  }
}

// Step 7: Force video to be enabled
function forceVideoEnabled(api) {
  console.log('🔍 Step 7: Forcing video to be enabled...');
  
  if (!api) {
    console.error('❌ No API to force video');
    return false;
  }
  
  try {
    // Try multiple approaches to enable video
    console.log('🔄 Attempting to unmute video...');
    api.executeCommand('toggleVideo', false);
    
    setTimeout(() => {
      console.log('🔄 Setting video quality...');
      api.executeCommand('setVideoQuality', 720);
    }, 1000);
    
    setTimeout(() => {
      console.log('🔄 Forcing video unmute again...');
      api.executeCommand('toggleVideo', false);
    }, 2000);
    
    console.log('✅ Video force commands sent');
    return true;
  } catch (error) {
    console.error('❌ Error forcing video:', error);
    return false;
  }
}

// Step 8: Check for video elements in iframe
function checkVideoElements(iframe) {
  console.log('🔍 Step 8: Checking for video elements...');
  
  if (!iframe) {
    console.error('❌ No iframe to check');
    return false;
  }
  
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      const videoElements = iframeDoc.querySelectorAll('video');
      console.log(`Found ${videoElements.length} video elements in iframe`);
      
      videoElements.forEach((video, index) => {
        console.log(`Video ${index}:`, {
          src: video.src,
          readyState: video.readyState,
          paused: video.paused,
          muted: video.muted,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          currentTime: video.currentTime,
          duration: video.duration
        });
      });
      
      return videoElements.length > 0;
    } else {
      console.log('⚠️ Cannot access iframe content (cross-origin)');
      return false;
    }
  } catch (error) {
    console.log('⚠️ Cannot access iframe content:', error.message);
    return false;
  }
}

// Main diagnostic function
async function runEmergencyDiagnosis() {
  console.log('🚨 STARTING EMERGENCY VIDEO DIAGNOSIS...');
  console.log('==========================================');
  
  // Step 1: Check Jitsi loading
  const jitsiLoaded = checkJitsiLoaded();
  if (!jitsiLoaded) {
    console.error('❌ CRITICAL: Jitsi not loaded - cannot proceed');
    return;
  }
  
  // Step 2: Check container
  const container = checkJitsiContainer();
  if (!container) {
    console.error('❌ CRITICAL: No Jitsi container - cannot proceed');
    return;
  }
  
  // Step 3: Check iframe
  const iframe = checkJitsiIframe(container);
  if (!iframe) {
    console.error('❌ CRITICAL: No Jitsi iframe - cannot proceed');
    return;
  }
  
  // Step 4: Check API
  const api = checkJitsiAPI(container);
  if (!api) {
    console.error('❌ CRITICAL: No Jitsi API - cannot proceed');
    return;
  }
  
  // Step 5: Check permissions
  const permissionsOk = await checkCameraPermissions();
  if (!permissionsOk) {
    console.error('❌ CRITICAL: Camera permissions denied');
    return;
  }
  
  // Step 6: Test camera
  const cameraOk = await testCameraAccess();
  if (!cameraOk) {
    console.error('❌ CRITICAL: Camera access failed');
    return;
  }
  
  // Step 7: Force video
  const videoForced = forceVideoEnabled(api);
  if (!videoForced) {
    console.error('❌ CRITICAL: Could not force video');
    return;
  }
  
  // Step 8: Check video elements
  setTimeout(() => {
    const videoElementsFound = checkVideoElements(iframe);
    if (videoElementsFound) {
      console.log('✅ Video elements found in iframe');
    } else {
      console.error('❌ No video elements found in iframe');
    }
  }, 5000);
  
  console.log('==========================================');
  console.log('🎉 EMERGENCY DIAGNOSIS COMPLETE');
  console.log('Check the results above for any critical issues');
}

// Export functions for manual use
window.emergencyVideoFix = {
  runEmergencyDiagnosis,
  checkJitsiLoaded,
  checkJitsiContainer,
  checkJitsiIframe,
  checkJitsiAPI,
  checkCameraPermissions,
  testCameraAccess,
  forceVideoEnabled,
  checkVideoElements
};

// Auto-run the diagnosis
runEmergencyDiagnosis();
