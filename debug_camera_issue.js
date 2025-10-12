// Comprehensive Camera Debug Script
// Run this in your browser console to diagnose camera issues

console.log('🎥 Starting Comprehensive Camera Debug...');

// Test 1: Check if Jitsi is loaded
function checkJitsiLoaded() {
  console.log('🔍 Test 1: Checking Jitsi loading...');
  
  if (window.JitsiMeetExternalAPI) {
    console.log('✅ JitsiMeetExternalAPI is loaded');
    return true;
  } else {
    console.error('❌ JitsiMeetExternalAPI is NOT loaded');
    return false;
  }
}

// Test 2: Check if Jitsi container exists
function checkJitsiContainer() {
  console.log('🔍 Test 2: Checking Jitsi container...');
  
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

// Test 3: Check if Jitsi iframe exists
function checkJitsiIframe(container) {
  console.log('🔍 Test 3: Checking Jitsi iframe...');
  
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

// Test 4: Check if Jitsi API instance exists
function checkJitsiAPI(container) {
  console.log('🔍 Test 4: Checking Jitsi API instance...');
  
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

// Test 5: Check camera permissions
async function checkCameraPermissions() {
  console.log('🔍 Test 5: Checking camera permissions...');
  
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
    return true; // Assume it's working if we can't check
  }
}

// Test 6: Test camera access
async function testCameraAccess() {
  console.log('🔍 Test 6: Testing camera access...');
  
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

// Test 7: Force video to be enabled
function forceVideoEnabled(api) {
  console.log('🔍 Test 7: Forcing video to be enabled...');
  
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

// Test 8: Check for video elements in iframe
function checkVideoElements(iframe) {
  console.log('🔍 Test 8: Checking for video elements...');
  
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

// Test 9: Check Jitsi server connectivity
async function checkJitsiServer() {
  console.log('🔍 Test 9: Checking Jitsi server connectivity...');
  
  try {
    const response = await fetch('https://stream.biblenow.io/external_api.js', { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log('✅ Jitsi server is accessible');
    return true;
  } catch (error) {
    console.error('❌ Jitsi server connection failed:', error);
    return false;
  }
}

// Test 10: Check browser compatibility
function checkBrowserCompatibility() {
  console.log('🔍 Test 10: Checking browser compatibility...');
  
  const userAgent = navigator.userAgent;
  console.log('User Agent:', userAgent);
  
  // Check for required APIs
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);
  const hasWebSocket = !!window.WebSocket;
  
  console.log('Browser capabilities:', {
    getUserMedia: hasGetUserMedia,
    WebRTC: hasWebRTC,
    WebSocket: hasWebSocket
  });
  
  if (!hasGetUserMedia) {
    console.error('❌ getUserMedia not supported');
    return false;
  }
  
  if (!hasWebRTC) {
    console.error('❌ WebRTC not supported');
    return false;
  }
  
  console.log('✅ Browser is compatible');
  return true;
}

// Main diagnostic function
async function runComprehensiveDiagnosis() {
  console.log('🚨 STARTING COMPREHENSIVE CAMERA DIAGNOSIS...');
  console.log('===============================================');
  
  const results = {
    jitsiLoaded: false,
    containerFound: false,
    iframeFound: false,
    apiFound: false,
    permissionsOk: false,
    cameraOk: false,
    videoForced: false,
    videoElementsFound: false,
    serverOk: false,
    browserOk: false
  };
  
  // Test 1: Jitsi loading
  results.jitsiLoaded = checkJitsiLoaded();
  if (!results.jitsiLoaded) {
    console.error('❌ CRITICAL: Jitsi not loaded - cannot proceed');
    return results;
  }
  
  // Test 2: Container
  const container = checkJitsiContainer();
  results.containerFound = !!container;
  if (!results.containerFound) {
    console.error('❌ CRITICAL: No Jitsi container - cannot proceed');
    return results;
  }
  
  // Test 3: Iframe
  const iframe = checkJitsiIframe(container);
  results.iframeFound = !!iframe;
  if (!results.iframeFound) {
    console.error('❌ CRITICAL: No Jitsi iframe - cannot proceed');
    return results;
  }
  
  // Test 4: API
  const api = checkJitsiAPI(container);
  results.apiFound = !!api;
  if (!results.apiFound) {
    console.error('❌ CRITICAL: No Jitsi API - cannot proceed');
    return results;
  }
  
  // Test 5: Permissions
  results.permissionsOk = await checkCameraPermissions();
  if (!results.permissionsOk) {
    console.error('❌ CRITICAL: Camera permissions denied');
    return results;
  }
  
  // Test 6: Camera
  results.cameraOk = await testCameraAccess();
  if (!results.cameraOk) {
    console.error('❌ CRITICAL: Camera access failed');
    return results;
  }
  
  // Test 7: Force video
  results.videoForced = forceVideoEnabled(api);
  if (!results.videoForced) {
    console.error('❌ CRITICAL: Could not force video');
    return results;
  }
  
  // Test 8: Video elements
  setTimeout(() => {
    results.videoElementsFound = checkVideoElements(iframe);
    if (!results.videoElementsFound) {
      console.error('❌ No video elements found in iframe');
    } else {
      console.log('✅ Video elements found in iframe');
    }
  }, 5000);
  
  // Test 9: Server
  results.serverOk = await checkJitsiServer();
  if (!results.serverOk) {
    console.error('❌ CRITICAL: Jitsi server not accessible');
    return results;
  }
  
  // Test 10: Browser
  results.browserOk = checkBrowserCompatibility();
  if (!results.browserOk) {
    console.error('❌ CRITICAL: Browser not compatible');
    return results;
  }
  
  console.log('===============================================');
  console.log('🎉 COMPREHENSIVE DIAGNOSIS COMPLETE');
  console.log('Results:', results);
  
  // Summary
  const criticalTests = ['jitsiLoaded', 'containerFound', 'iframeFound', 'apiFound', 'permissionsOk', 'cameraOk', 'serverOk', 'browserOk'];
  const passedCriticalTests = criticalTests.filter(test => results[test]).length;
  
  console.log(`Critical tests passed: ${passedCriticalTests}/${criticalTests.length}`);
  
  if (passedCriticalTests === criticalTests.length) {
    console.log('✅ All critical tests passed - camera should be working');
  } else {
    console.log('❌ Some critical tests failed - check the issues above');
  }
  
  return results;
}

// Export functions for manual use
window.cameraDebug = {
  runComprehensiveDiagnosis,
  checkJitsiLoaded,
  checkJitsiContainer,
  checkJitsiIframe,
  checkJitsiAPI,
  checkCameraPermissions,
  testCameraAccess,
  forceVideoEnabled,
  checkVideoElements,
  checkJitsiServer,
  checkBrowserCompatibility
};

// Auto-run the diagnosis
runComprehensiveDiagnosis();