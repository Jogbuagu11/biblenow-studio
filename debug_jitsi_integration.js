// Debug script for Jitsi integration issues
// Run this in the browser console on the BibleNOW Studio app

async function debugJitsiIntegration() {
  console.log('🔍 Debugging Jitsi Integration Issues\n');

  try {
    // Check if we're in the right environment
    if (typeof window === 'undefined') {
      console.error('❌ This test must be run in a browser environment');
      return;
    }

    // Step 1: Check Jitsi External API availability
    console.log('1️⃣ Checking Jitsi External API...');
    if (window.JitsiMeetExternalAPI) {
      console.log('✅ JitsiMeetExternalAPI is available');
    } else {
      console.error('❌ JitsiMeetExternalAPI is not available');
      console.log('   Make sure the external_api.js script is loaded');
      return;
    }

    // Step 2: Check environment variables
    console.log('\n2️⃣ Checking environment configuration...');
    const jitsiConfig = {
      domain: process.env.REACT_APP_JITSI_DOMAIN || 'stream.biblenow.io',
      appId: process.env.REACT_APP_JITSI_APP_ID || 'biblenow',
      jwtSecret: process.env.REACT_APP_JITSI_JWT_SECRET || process.env.JWT_APP_SECRET || null
    };
    
    console.log('📋 Jitsi Configuration:');
    console.log('   Domain:', jitsiConfig.domain);
    console.log('   App ID:', jitsiConfig.appId);
    console.log('   JWT Secret:', jitsiConfig.jwtSecret ? '✅ SET' : '❌ NOT SET');

    // Step 3: Test JWT token generation
    console.log('\n3️⃣ Testing JWT token generation...');
    try {
      const testUser = {
        uid: 'test-user-123',
        email: 'test@biblenowstudio.com',
        displayName: 'Test User'
      };
      
      // Import the JWT service
      const jwtAuthService = await import('./src/services/jwtAuthService');
      const token = await jwtAuthService.default.generateJitsiToken(testUser, 'test-room', true);
      
      if (token) {
        console.log('✅ JWT token generated successfully');
        console.log('   Token length:', token.length, 'characters');
        
        // Decode token to verify contents
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payloadBase64 = tokenParts[1];
            const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
            const payload = JSON.parse(payloadJson);
            console.log('   Token payload:', payload);
          }
        } catch (decodeError) {
          console.warn('⚠️ Could not decode JWT token:', decodeError);
        }
      } else {
        console.error('❌ JWT token generation failed');
      }
    } catch (jwtError) {
      console.error('❌ JWT token generation error:', jwtError);
    }

    // Step 4: Test iframe permissions
    console.log('\n4️⃣ Testing iframe permissions...');
    const testIframe = document.createElement('iframe');
    testIframe.src = 'about:blank';
    testIframe.style.display = 'none';
    document.body.appendChild(testIframe);
    
    // Check if we can set permissions
    try {
      testIframe.setAttribute('allow', 'camera; microphone; display-capture; autoplay; fullscreen');
      testIframe.setAttribute('allowfullscreen', 'true');
      testIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation');
      console.log('✅ Iframe permissions can be set');
    } catch (permError) {
      console.error('❌ Cannot set iframe permissions:', permError);
    }
    
    // Clean up test iframe
    document.body.removeChild(testIframe);

    // Step 5: Test Jitsi server connectivity
    console.log('\n5️⃣ Testing Jitsi server connectivity...');
    try {
      const response = await fetch(`https://${jitsiConfig.domain}/external_api.js`, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      console.log('✅ Jitsi server is reachable');
    } catch (connectError) {
      console.error('❌ Cannot reach Jitsi server:', connectError);
    }

    // Step 6: Check current page context
    console.log('\n6️⃣ Checking page context...');
    console.log('   Current URL:', window.location.href);
    console.log('   Is HTTPS:', window.location.protocol === 'https:');
    console.log('   User Agent:', navigator.userAgent);
    console.log('   Media Devices API:', navigator.mediaDevices ? '✅ Available' : '❌ Not available');

    // Step 7: Test media permissions
    console.log('\n7️⃣ Testing media permissions...');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('✅ Camera and microphone permissions granted');
        console.log('   Video tracks:', stream.getVideoTracks().length);
        console.log('   Audio tracks:', stream.getAudioTracks().length);
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
      } catch (mediaError) {
        console.warn('⚠️ Media permissions denied:', mediaError);
      }
    } else {
      console.error('❌ Media Devices API not available');
    }

    console.log('\n🎉 Jitsi integration debug completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ JitsiMeetExternalAPI availability checked');
    console.log('   ✅ Environment configuration reviewed');
    console.log('   ✅ JWT token generation tested');
    console.log('   ✅ Iframe permissions tested');
    console.log('   ✅ Jitsi server connectivity tested');
    console.log('   ✅ Page context analyzed');
    console.log('   ✅ Media permissions tested');

    console.log('\n🔧 Common fixes:');
    console.log('   1. Ensure JWT_APP_SECRET is set in environment variables');
    console.log('   2. Check that stream.biblenow.io is accessible');
    console.log('   3. Verify HTTPS is being used (required for media access)');
    console.log('   4. Check browser permissions for camera/microphone');
    console.log('   5. Ensure the Jitsi server is properly configured for JWT auth');

  } catch (error) {
    console.error('❌ Debug failed with error:', error);
  }
}

// Instructions
console.log('📖 Jitsi Integration Debug Instructions:');
console.log('1. Open the BibleNOW Studio app in your browser');
console.log('2. Navigate to a livestream page');
console.log('3. Open the browser developer console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Run: debugJitsiIntegration()');
console.log('\n🚀 Ready to debug! Run: debugJitsiIntegration()');
