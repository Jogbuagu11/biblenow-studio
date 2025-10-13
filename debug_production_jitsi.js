// Production Jitsi Debug Script
// Run this in the browser console on your production site

async function debugProductionJitsi() {
  console.log('🔍 Debugging Production Jitsi Issues\n');

  try {
    // Step 1: Check environment and configuration
    console.log('1️⃣ Environment Check:');
    console.log('   Current URL:', window.location.href);
    console.log('   Is HTTPS:', window.location.protocol === 'https:');
    console.log('   User Agent:', navigator.userAgent);
    console.log('   Production Environment:', process.env.NODE_ENV);

    // Step 2: Check Jitsi External API
    console.log('\n2️⃣ Jitsi External API Check:');
    if (window.JitsiMeetExternalAPI) {
      console.log('✅ JitsiMeetExternalAPI is available');
    } else {
      console.error('❌ JitsiMeetExternalAPI is not available');
      console.log('   This is likely the main issue!');
      return;
    }

    // Step 3: Check iframe and container
    console.log('\n3️⃣ Iframe and Container Check:');
    const container = document.querySelector('[ref="containerRef"]') || 
                     document.querySelector('.w-full.h-full') ||
                     document.querySelector('div[class*="container"]');
    
    if (container) {
      console.log('✅ Container found:', container);
      const iframe = container.querySelector('iframe');
      if (iframe) {
        console.log('✅ Iframe found:', iframe);
        console.log('   Iframe src:', iframe.src);
        console.log('   Iframe allow:', iframe.getAttribute('allow'));
        console.log('   Iframe sandbox:', iframe.getAttribute('sandbox'));
      } else {
        console.error('❌ No iframe found in container');
        console.log('   This means Jitsi failed to create the iframe');
      }
    } else {
      console.error('❌ No container found');
    }

    // Step 4: Check for JWT token generation
    console.log('\n4️⃣ JWT Token Check:');
    try {
      // Check if we can access the JWT service
      const jwtService = await import('./src/services/jwtAuthService');
      console.log('✅ JWT service is accessible');
      
      // Try to generate a test token
      const testUser = {
        uid: 'test-user-123',
        email: 'test@biblenowstudio.com',
        displayName: 'Test User'
      };
      
      const token = await jwtService.default.generateJitsiToken(testUser, 'test-room', false);
      if (token) {
        console.log('✅ JWT token generated successfully');
        console.log('   Token length:', token.length);
        
        // Decode token to check contents
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
      console.error('❌ JWT service error:', jwtError);
    }

    // Step 5: Check network connectivity
    console.log('\n5️⃣ Network Connectivity Check:');
    try {
      const response = await fetch('https://stream.biblenow.io/external_api.js', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      console.log('✅ Jitsi server is reachable');
    } catch (connectError) {
      console.error('❌ Cannot reach Jitsi server:', connectError);
    }

    // Step 6: Check for console errors
    console.log('\n6️⃣ Console Error Check:');
    console.log('   Check the browser console for any red error messages');
    console.log('   Look for:');
    console.log('   - JWT authentication errors');
    console.log('   - CORS errors');
    console.log('   - Network errors');
    console.log('   - Jitsi API errors');

    // Step 7: Check environment variables
    console.log('\n7️⃣ Environment Variables Check:');
    console.log('   REACT_APP_JITSI_DOMAIN:', process.env.REACT_APP_JITSI_DOMAIN || 'Not set');
    console.log('   REACT_APP_JITSI_APP_ID:', process.env.REACT_APP_JITSI_APP_ID || 'Not set');
    console.log('   REACT_APP_JITSI_JWT_SECRET:', process.env.REACT_APP_JITSI_JWT_SECRET ? 'Set' : 'Not set');
    console.log('   JWT_APP_SECRET:', process.env.JWT_APP_SECRET ? 'Set' : 'Not set');

    // Step 8: Check authentication state
    console.log('\n8️⃣ Authentication State Check:');
    try {
      const authStore = await import('./src/stores/supabaseAuthStore');
      const user = authStore.useSupabaseAuthStore.getState().user;
      if (user) {
        console.log('✅ User is authenticated:', user.email);
      } else {
        console.error('❌ User is not authenticated');
        console.log('   This could cause JWT token generation to fail');
      }
    } catch (authError) {
      console.error('❌ Auth store error:', authError);
    }

    console.log('\n🎯 Common Production Issues:');
    console.log('   1. JWT_APP_SECRET not set in production environment');
    console.log('   2. CORS issues with Jitsi server');
    console.log('   3. HTTPS required for media access');
    console.log('   4. Jitsi server not properly configured for JWT auth');
    console.log('   5. Network connectivity issues');

    console.log('\n🔧 Next Steps:');
    console.log('   1. Check Vercel environment variables');
    console.log('   2. Verify Jitsi server configuration');
    console.log('   3. Check browser console for specific errors');
    console.log('   4. Test JWT token generation manually');

  } catch (error) {
    console.error('❌ Debug failed with error:', error);
  }
}

// Instructions
console.log('📖 Production Jitsi Debug Instructions:');
console.log('1. Open your production site in the browser');
console.log('2. Navigate to a livestream page');
console.log('3. Open the browser developer console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Run: debugProductionJitsi()');
console.log('\n🚀 Ready to debug! Run: debugProductionJitsi()');
