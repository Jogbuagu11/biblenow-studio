// Test Jitsi Connection - Run this in browser console
console.log('🧪 Testing Jitsi Connection...');

// Test 1: Check if Jitsi script is loaded
console.log('🔍 Test 1: Checking Jitsi script...');
if (window.JitsiMeetExternalAPI) {
  console.log('✅ JitsiMeetExternalAPI is loaded');
} else {
  console.error('❌ JitsiMeetExternalAPI is NOT loaded');
  console.log('Available window properties:', Object.keys(window).filter(k => k.includes('Jitsi')));
}

// Test 2: Check Jitsi server connectivity
console.log('🔍 Test 2: Testing Jitsi server connectivity...');
fetch('https://stream.biblenow.io/external_api.js')
  .then(response => {
    if (response.ok) {
      console.log('✅ Jitsi server is accessible');
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    } else {
      console.error('❌ Jitsi server returned error:', response.status, response.statusText);
    }
  })
  .catch(error => {
    console.error('❌ Jitsi server connection failed:', error);
  });

// Test 3: Test basic Jitsi initialization
console.log('🔍 Test 3: Testing basic Jitsi initialization...');
if (window.JitsiMeetExternalAPI) {
  try {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'jitsi-test-container';
    testContainer.style.width = '400px';
    testContainer.style.height = '300px';
    testContainer.style.border = '1px solid red';
    testContainer.style.position = 'fixed';
    testContainer.style.top = '10px';
    testContainer.style.right = '10px';
    testContainer.style.zIndex = '9999';
    document.body.appendChild(testContainer);
    
    console.log('📦 Created test container');
    
    // Try to initialize Jitsi with minimal config
    const testAPI = new window.JitsiMeetExternalAPI('stream.biblenow.io', {
      roomName: 'test-room-' + Date.now(),
      parentNode: testContainer,
      width: '100%',
      height: '100%',
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        prejoinPageEnabled: false,
        enableWelcomePage: false
      },
      interfaceConfigOverwrite: {
        SHOW_PREJOIN_PAGE: false,
        SHOW_WELCOME_PAGE: false
      }
    });
    
    console.log('✅ Jitsi test instance created successfully');
    
    // Add event listeners
    testAPI.addListener('videoConferenceJoined', () => {
      console.log('🎉 Test conference joined successfully');
    });
    
    testAPI.addListener('videoConferenceLeft', () => {
      console.log('👋 Test conference left');
    });
    
    testAPI.addListener('error', (error) => {
      console.error('❌ Test Jitsi error:', error);
    });
    
    testAPI.addListener('readyToClose', () => {
      console.log('🚪 Test ready to close');
    });
    
    // Store reference for cleanup
    window.testJitsiAPI = testAPI;
    
    // Clean up after 30 seconds
    setTimeout(() => {
      console.log('🧹 Cleaning up test Jitsi instance...');
      if (window.testJitsiAPI) {
        window.testJitsiAPI.dispose();
        window.testJitsiAPI = null;
      }
      if (testContainer && testContainer.parentNode) {
        testContainer.parentNode.removeChild(testContainer);
      }
      console.log('✅ Test cleanup complete');
    }, 30000);
    
  } catch (error) {
    console.error('❌ Jitsi test initialization failed:', error);
  }
} else {
  console.error('❌ Cannot test Jitsi - API not loaded');
}

// Test 4: Check camera permissions
console.log('🔍 Test 4: Checking camera permissions...');
navigator.permissions.query({ name: 'camera' })
  .then(permissionStatus => {
    console.log('📹 Camera permission status:', permissionStatus.state);
    if (permissionStatus.state === 'denied') {
      console.error('❌ Camera permission is denied');
    } else if (permissionStatus.state === 'granted') {
      console.log('✅ Camera permission is granted');
    } else {
      console.log('⚠️ Camera permission not yet requested');
    }
  })
  .catch(error => {
    console.warn('⚠️ Could not check camera permissions:', error);
  });

// Test 5: Test camera access
console.log('🔍 Test 5: Testing camera access...');
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
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
  })
  .catch(error => {
    console.error('❌ Camera access failed:', error);
  });

console.log('🎉 Jitsi connection test complete! Check results above.');
