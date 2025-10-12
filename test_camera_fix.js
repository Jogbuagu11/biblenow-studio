// Test Camera Fix Script
// Run this in your browser console to test if the camera fix is working

console.log('🎥 Testing Camera Fix...');

// Function to test camera access
async function testCameraAccess() {
  try {
    console.log('🔍 Testing camera access...');
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }, 
      audio: true 
    });
    
    console.log('✅ Camera access successful!');
    console.log('Video tracks:', stream.getVideoTracks().length);
    console.log('Audio tracks:', stream.getAudioTracks().length);
    
    // Check video track details
    stream.getVideoTracks().forEach((track, index) => {
      console.log(`Video track ${index}:`, {
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
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

// Function to check Jitsi container
function checkJitsiContainer() {
  const container = document.querySelector('[data-testid="jitsi-container"]');
  if (container) {
    console.log('✅ Jitsi container found');
    console.log('Container dimensions:', {
      width: container.offsetWidth,
      height: container.offsetHeight
    });
    return container;
  } else {
    console.error('❌ Jitsi container NOT found');
    return null;
  }
}

// Function to check Jitsi iframe
function checkJitsiIframe(container) {
  if (!container) return null;
  
  const iframe = container.querySelector('iframe');
  if (iframe) {
    console.log('✅ Jitsi iframe found');
    console.log('Iframe src:', iframe.src);
    return iframe;
  } else {
    console.error('❌ Jitsi iframe NOT found');
    return null;
  }
}

// Function to check Jitsi API
function checkJitsiAPI(container) {
  if (!container) return null;
  
  if (container._jitsiAPI) {
    console.log('✅ Jitsi API instance found');
    return container._jitsiAPI;
  } else {
    console.error('❌ Jitsi API instance NOT found');
    return null;
  }
}

// Function to force video on
function forceVideoOn(api) {
  if (!api) {
    console.error('❌ No API to force video');
    return false;
  }
  
  try {
    console.log('🔄 Forcing video on...');
    api.executeCommand('toggleVideo', false);
    console.log('✅ Video unmute command sent');
    
    setTimeout(() => {
      api.executeCommand('setVideoQuality', 720);
      console.log('✅ Video quality set to 720p');
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('❌ Error forcing video:', error);
    return false;
  }
}

// Main test function
async function runCameraTest() {
  console.log('🚨 STARTING CAMERA TEST...');
  console.log('================================');
  
  // Test 1: Camera access
  const cameraOk = await testCameraAccess();
  if (!cameraOk) {
    console.error('❌ CRITICAL: Camera access failed');
    return;
  }
  
  // Test 2: Jitsi container
  const container = checkJitsiContainer();
  if (!container) {
    console.error('❌ CRITICAL: No Jitsi container');
    return;
  }
  
  // Test 3: Jitsi iframe
  const iframe = checkJitsiIframe(container);
  if (!iframe) {
    console.error('❌ CRITICAL: No Jitsi iframe');
    return;
  }
  
  // Test 4: Jitsi API
  const api = checkJitsiAPI(container);
  if (!api) {
    console.error('❌ CRITICAL: No Jitsi API');
    return;
  }
  
  // Test 5: Force video on
  const videoForced = forceVideoOn(api);
  if (!videoForced) {
    console.error('❌ CRITICAL: Could not force video');
    return;
  }
  
  console.log('================================');
  console.log('✅ ALL TESTS PASSED - Camera should be working!');
  console.log('If you still see a black screen, try refreshing the page.');
}

// Export for manual use
window.testCamera = runCameraTest;

// Auto-run the test
runCameraTest();
