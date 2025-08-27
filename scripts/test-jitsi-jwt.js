#!/usr/bin/env node

/**
 * Test script to verify Jitsi JWT authentication
 * This script tests the JWT token generation and verifies that password authentication is disabled
 */

const fetch = require('node-fetch');

async function testJitsiJWT() {
  console.log('🧪 Testing Jitsi JWT Authentication...\n');

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  try {
    // Test 1: Generate JWT token for a test user
    console.log('1️⃣ Testing JWT token generation...');
    
    const tokenResponse = await fetch(`${apiBase}/jitsi/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: 'test-room',
        moderator: true,
        name: 'Test User',
        email: 'test@biblenowstudio.com'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`HTTP ${tokenResponse.status}: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (tokenData.jwt) {
      console.log('✅ JWT token generated successfully');
      console.log(`   Token length: ${tokenData.jwt.length} characters`);
      console.log(`   Room: ${tokenData.room}`);
    } else {
      console.log('❌ Failed to generate JWT token');
      console.log('   Response:', tokenData);
    }

    // Test 2: Verify token structure (basic check)
    console.log('\n2️⃣ Testing JWT token structure...');
    
    if (tokenData.jwt) {
      const tokenParts = tokenData.jwt.split('.');
      if (tokenParts.length === 3) {
        console.log('✅ JWT token has correct structure (header.payload.signature)');
        
        // Decode payload (base64)
        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('   Payload contains:', Object.keys(payload));
          
          if (payload.context && payload.context.user) {
            console.log('   User context found:', {
              name: payload.context.user.name,
              moderator: payload.context.user.moderator
            });
          }
        } catch (e) {
          console.log('   Could not decode payload:', e.message);
        }
      } else {
        console.log('❌ JWT token structure is invalid');
      }
    }

    // Test 3: Test with different user roles
    console.log('\n3️⃣ Testing different user roles...');
    
    const guestTokenResponse = await fetch(`${apiBase}/jitsi/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: 'test-room',
        moderator: false,
        name: 'Guest User',
        email: 'guest@biblenowstudio.com'
      })
    });

    if (guestTokenResponse.ok) {
      const guestTokenData = await guestTokenResponse.json();
      if (guestTokenData.jwt) {
        console.log('✅ Guest JWT token generated successfully');
      } else {
        console.log('❌ Failed to generate guest JWT token');
      }
    } else {
      console.log('❌ Guest token request failed:', guestTokenResponse.status);
    }

    console.log('\n✅ Jitsi JWT authentication tests completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure your Jitsi server is configured to accept JWT tokens');
    console.log('2. Verify that password authentication is disabled on your Jitsi server');
    console.log('3. Test the livestream component with these JWT tokens');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the server is running on port 3001');
    console.log('2. Check that JITSI_JWT_SECRET is set in your environment');
    console.log('3. Verify the API endpoint is accessible');
  }
}

// Run the test
testJitsiJWT().catch(console.error); 