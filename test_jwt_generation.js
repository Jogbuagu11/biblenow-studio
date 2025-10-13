// Test JWT generation to verify dynamic tokens are working
// Run this in your browser console on the BibleNOW Studio app

async function testJWTGeneration() {
  console.log('🧪 Testing JWT Generation\n');

  try {
    // Check if we're in the right environment
    if (typeof window === 'undefined') {
      console.error('❌ This test must be run in a browser environment');
      return;
    }

    // Check if Supabase is available
    if (!window.supabase) {
      console.error('❌ Supabase client not found. Make sure you\'re on the BibleNOW Studio app');
      return;
    }

    const supabase = window.supabase;

    // Step 1: Check current user
    console.log('1️⃣ Checking current user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ No authenticated user found. Please log in first.');
      return;
    }

    console.log(`✅ User authenticated: ${user.email} (${user.id})`);

    // Step 2: Test JWT generation
    console.log('\n2️⃣ Testing JWT generation...');
    
    // Import the JWT service
    const { default: jwtAuthService } = await import('./src/services/jwtAuthService.ts');
    
    const testUser = {
      uid: user.id,
      email: user.email,
      displayName: user.user_metadata?.full_name || user.email
    };

    const testRoomName = 'test-room-' + Date.now();
    const isModerator = true;

    console.log('📋 Test parameters:', {
      user: testUser,
      roomName: testRoomName,
      isModerator
    });

    try {
      const jwtToken = await jwtAuthService.generateJitsiToken(testUser, testRoomName, isModerator);
      
      if (jwtToken) {
        console.log('✅ JWT token generated successfully!');
        console.log('🔑 Token length:', jwtToken.length, 'characters');
        console.log('🔑 Token preview:', jwtToken.substring(0, 50) + '...');
        
        // Decode the JWT to see its contents (without verification)
        try {
          const tokenParts = jwtToken.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('📋 Token payload:', payload);
          console.log('⏰ Token expires:', new Date(payload.exp * 1000).toLocaleString());
          console.log('👤 User in token:', payload.context?.user);
        } catch (decodeError) {
          console.log('⚠️ Could not decode token payload:', decodeError.message);
        }
      } else {
        console.error('❌ Failed to generate JWT token');
      }
    } catch (jwtError) {
      console.error('❌ Error generating JWT token:', jwtError);
    }

    // Step 3: Test multiple tokens (should be different)
    console.log('\n3️⃣ Testing multiple token generation...');
    
    const tokens = [];
    for (let i = 0; i < 3; i++) {
      const roomName = `test-room-${i}-${Date.now()}`;
      const token = await jwtAuthService.generateJitsiToken(testUser, roomName, false);
      tokens.push(token);
      console.log(`Token ${i + 1}:`, token ? token.substring(0, 30) + '...' : 'Failed');
    }

    // Check if tokens are different
    const uniqueTokens = new Set(tokens.filter(t => t));
    if (uniqueTokens.size > 1) {
      console.log('✅ Dynamic tokens are being generated (tokens are different)');
    } else if (uniqueTokens.size === 1) {
      console.log('⚠️ All tokens are the same (might be using fallback/hardcoded token)');
    } else {
      console.log('❌ No tokens were generated');
    }

    // Step 4: Test server endpoint directly
    console.log('\n4️⃣ Testing server endpoint directly...');
    
    try {
      const apiBase = process.env.REACT_APP_API_URL || 'https://biblenow-studio-backend.onrender.com/api';
      const response = await fetch(`${apiBase}/jitsi/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: 'direct-test-room',
          moderator: false,
          name: testUser.displayName,
          email: testUser.email
        })
      });

      console.log('📡 Direct server response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Direct server call successful:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Direct server call failed:', errorText);
      }
    } catch (directError) {
      console.error('❌ Direct server call error:', directError);
    }

    console.log('\n🎉 JWT generation test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication verified');
    console.log('   ✅ JWT service imported');
    console.log('   ✅ Token generation tested');
    console.log('   ✅ Multiple tokens tested');
    console.log('   ✅ Direct server endpoint tested');

    console.log('\n📧 Next steps:');
    console.log('   1. Check if tokens are dynamic (different for each request)');
    console.log('   2. Verify server endpoint is responding correctly');
    console.log('   3. Check Jitsi authentication works with new tokens');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Instructions for running the test
console.log('📖 JWT Generation Test Instructions:');
console.log('1. Open the BibleNOW Studio app in your browser');
console.log('2. Log in to your account');
console.log('3. Open the browser developer console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Run: testJWTGeneration()');
console.log('\n🚀 Ready to test! Run: testJWTGeneration()');
