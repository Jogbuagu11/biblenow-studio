// Video Feed Debugging Script
// Add this to your browser console to debug Jitsi video feed issues

console.log('🔍 Starting Video Feed Debug...');

// 1. Check if Jitsi script is loaded
function checkJitsiScript() {
  const jitsiScript = document.querySelector('script[src*="jitsi"]');
  if (jitsiScript) {
    console.log('✅ Jitsi script found:', jitsiScript.src);
  } else {
    console.log('❌ Jitsi script not found');
  }
  
  // Check if JitsiMeetExternalAPI is available
  if (window.JitsiMeetExternalAPI) {
    console.log('✅ JitsiMeetExternalAPI is available');
  } else {
    console.log('❌ JitsiMeetExternalAPI is not available');
  }
}

// 2. Check iframe and container
function checkIframeAndContainer() {
  const container = document.querySelector('[data-testid="jitsi-container"]') || 
                   document.querySelector('.jitsi-container') ||
                   document.querySelector('#jitsi-container');
  
  if (container) {
    console.log('✅ Jitsi container found:', container);
    console.log('Container dimensions:', {
      width: container.offsetWidth,
      height: container.offsetHeight,
      display: getComputedStyle(container).display,
      visibility: getComputedStyle(container).visibility
    });
  } else {
    console.log('❌ Jitsi container not found');
  }
  
  // Check for iframe
  const iframe = document.querySelector('iframe[src*="jitsi"]') || 
                 document.querySelector('iframe[src*="stream.biblenow.io"]');
  
  if (iframe) {
    console.log('✅ Jitsi iframe found:', iframe.src);
    console.log('Iframe dimensions:', {
      width: iframe.offsetWidth,
      height: iframe.offsetHeight,
      display: getComputedStyle(iframe).display,
      visibility: getComputedStyle(iframe).visibility
    });
    
    // Check iframe load status
    iframe.onload = () => console.log('✅ Iframe loaded successfully');
    iframe.onerror = () => console.log('❌ Iframe failed to load');
  } else {
    console.log('❌ Jitsi iframe not found');
  }
}

// 3. Check camera and microphone permissions
async function checkMediaPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    console.log('✅ Camera and microphone permissions granted');
    console.log('Video tracks:', stream.getVideoTracks().length);
    console.log('Audio tracks:', stream.getAudioTracks().length);
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
  } catch (error) {
    console.log('❌ Media permissions error:', error.message);
  }
}

// 4. Check network connectivity
function checkNetworkConnectivity() {
  if (navigator.onLine) {
    console.log('✅ Network is online');
  } else {
    console.log('❌ Network is offline');
  }
  
  // Test Jitsi server connectivity
  fetch('https://stream.biblenow.io', { mode: 'no-cors' })
    .then(() => console.log('✅ Jitsi server is reachable'))
    .catch(() => console.log('❌ Jitsi server is not reachable'));
}

// 5. Check console errors
function checkConsoleErrors() {
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  setTimeout(() => {
    console.log('📊 Console errors found:', errors.length);
    errors.forEach((error, index) => {
      console.log(`Error ${index + 1}:`, error);
    });
  }, 2000);
}

// 6. Check Jitsi configuration
function checkJitsiConfig() {
  console.log('🔧 Checking Jitsi configuration...');
  
  // Check for config object
  if (window.config) {
    console.log('✅ Global config found:', window.config);
  } else {
    console.log('❌ Global config not found');
  }
  
  // Check for interfaceConfig object
  if (window.interfaceConfig) {
    console.log('✅ Global interfaceConfig found:', window.interfaceConfig);
  } else {
    console.log('❌ Global interfaceConfig not found');
  }
  
  // Check for Jitsi API instance
  const jitsiContainer = document.querySelector('[data-testid="jitsi-container"]');
  if (jitsiContainer && jitsiContainer._jitsiAPI) {
    console.log('✅ Jitsi API instance found');
    console.log('API state:', jitsiContainer._jitsiAPI.getState());
  } else {
    console.log('❌ Jitsi API instance not found');
  }
}

// 7. Check room and JWT token
function checkRoomAndJWT() {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');
  console.log('🏠 Room from URL:', room);
  
  // Check for JWT token in iframe src
  const iframe = document.querySelector('iframe[src*="jwt="]');
  if (iframe) {
    const jwtMatch = iframe.src.match(/jwt=([^&]+)/);
    if (jwtMatch) {
      console.log('✅ JWT token found in iframe');
      console.log('JWT length:', jwtMatch[1].length);
    } else {
      console.log('❌ JWT token not found in iframe');
    }
  }
}

// 8. Check video element
function checkVideoElement() {
  const videoElements = document.querySelectorAll('video');
  console.log('📹 Video elements found:', videoElements.length);
  
  videoElements.forEach((video, index) => {
    console.log(`Video ${index + 1}:`, {
      src: video.src,
      currentSrc: video.currentSrc,
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      duration: video.duration,
      currentTime: video.currentTime,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight
    });
  });
}

// 9. Check for common issues
function checkCommonIssues() {
  console.log('🔍 Checking for common issues...');
  
  // Check if page is in iframe
  if (window !== window.top) {
    console.log('⚠️ Page is running in iframe - this might cause issues');
  }
  
  // Check for HTTPS
  if (location.protocol !== 'https:') {
    console.log('⚠️ Not using HTTPS - camera/microphone might not work');
  }
  
  // Check for localhost
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    console.log('⚠️ Running on localhost - some features might not work');
  }
  
  // Check for popup blockers
  if (window.opener === null && window.history.length === 1) {
    console.log('⚠️ Possible popup blocker detected');
  }
}

// 10. Run all checks
function runAllChecks() {
  console.log('🚀 Running comprehensive video feed debug...');
  console.log('=====================================');
  
  checkJitsiScript();
  checkIframeAndContainer();
  checkMediaPermissions();
  checkNetworkConnectivity();
  checkConsoleErrors();
  checkJitsiConfig();
  checkRoomAndJWT();
  checkVideoElement();
  checkCommonIssues();
  
  console.log('=====================================');
  console.log('✅ Debug complete! Check the results above.');
}

// Auto-run the debug
runAllChecks();

// Export functions for manual use
window.debugVideoFeed = {
  runAllChecks,
  checkJitsiScript,
  checkIframeAndContainer,
  checkMediaPermissions,
  checkNetworkConnectivity,
  checkJitsiConfig,
  checkRoomAndJWT,
  checkVideoElement,
  checkCommonIssues
};
