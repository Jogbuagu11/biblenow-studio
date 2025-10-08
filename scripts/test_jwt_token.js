#!/usr/bin/env node

/**
 * Test JWT Token for Livestream
 * Validates and tests the provided JWT token
 */

const jwt = require('jsonwebtoken');

// The JWT token you provided
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpVCJ9.eyJhdWQiOiJiaWJsZW5vd19saXZlX2FwcCIsImlzcyI6ImJpYmxlbm93X2xpdmVfYXBwIiwic3ViIjoidXNlckBleGFtcGxlLmNvbSIsInJvb20iOiIqIiwiY29udGV4dCI6eyJ1c2VyIjp7ImlkIjoidXNlci1pZCIsIm5hbWUiOiJoYXJlc2giLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJtb2RlcmF0b3IiOnRydWV9fSwiZXhwIjoxNzkxMDI0MDI4LCJuYmYiOjE3MDAwMDAwMDB9.VZCAD63OEcVlwVZmEoOudqiYi06ylxpFsAPrNtkHuqg';

async function testJWTToken() {
  console.log('🔍 Testing JWT Token for Livestream');
  console.log('===================================\n');
  
  try {
    // Decode the JWT token (without verification first)
    const decoded = jwt.decode(TEST_JWT_TOKEN, { complete: true });
    
    if (!decoded) {
      console.log('❌ Invalid JWT token format');
      return;
    }
    
    console.log('📋 Token Information:');
    console.log(`   Header: ${JSON.stringify(decoded.header, null, 2)}`);
    console.log(`   Payload: ${JSON.stringify(decoded.payload, null, 2)}`);
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.payload.exp;
    const nbf = decoded.payload.nbf;
    
    console.log('\n⏰ Token Timing:');
    console.log(`   Current time: ${now} (${new Date(now * 1000).toISOString()})`);
    console.log(`   Not before: ${nbf} (${new Date(nbf * 1000).toISOString()})`);
    console.log(`   Expires: ${exp} (${new Date(exp * 1000).toISOString()})`);
    
    if (now < nbf) {
      console.log('   ⚠️  Token is not yet valid (nbf)');
    } else if (now > exp) {
      console.log('   ❌ Token has expired');
    } else {
      console.log('   ✅ Token is currently valid');
    }
    
    // Check token structure
    console.log('\n🔍 Token Structure Analysis:');
    console.log(`   Algorithm: ${decoded.header.alg}`);
    console.log(`   Type: ${decoded.header.typ}`);
    console.log(`   Audience: ${decoded.payload.aud}`);
    console.log(`   Issuer: ${decoded.payload.iss}`);
    console.log(`   Subject: ${decoded.payload.sub}`);
    console.log(`   Room: ${decoded.payload.room}`);
    console.log(`   User ID: ${decoded.payload.context?.user?.id}`);
    console.log(`   User Name: ${decoded.payload.context?.user?.name}`);
    console.log(`   User Email: ${decoded.payload.context?.user?.email}`);
    console.log(`   Moderator: ${decoded.payload.context?.user?.moderator}`);
    
    // Test token verification (this will fail without the secret)
    console.log('\n🔐 Token Verification Test:');
    try {
      // Try to verify with a dummy secret (this will fail)
      jwt.verify(TEST_JWT_TOKEN, 'dummy-secret');
      console.log('   ⚠️  Token verification succeeded (unexpected)');
    } catch (verifyError) {
      console.log('   ✅ Token verification failed as expected (no secret provided)');
      console.log(`   Error: ${verifyError.message}`);
    }
    
    // Test with your production JWT endpoint
    console.log('\n🌐 Testing with Production JWT Endpoint:');
    try {
      const response = await fetch('https://biblenow-studio-backend.onrender.com/api/jitsi/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          room: 'test-room',
          moderator: true,
          name: 'Test User',
          email: 'test@example.com'
        })
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ Production endpoint is working');
        console.log(`   Generated JWT: ${data.jwt ? 'Yes' : 'No'}`);
        console.log(`   Room: ${data.room}`);
        console.log(`   Expires: ${data.expires ? new Date(data.expires * 1000).toISOString() : 'N/A'}`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Production endpoint error: ${errorText}`);
      }
    } catch (endpointError) {
      console.log(`   ❌ Endpoint test failed: ${endpointError.message}`);
    }
    
    // Instructions for using the token
    console.log('\n🚀 How to Use This Token:');
    console.log('1. Copy the JWT token:');
    console.log(`   ${TEST_JWT_TOKEN}`);
    console.log('\n2. Use it in your Jitsi iframe:');
    console.log('   const iframe = document.createElement("iframe");');
    console.log('   iframe.src = `https://your-jitsi-domain.com/room-name?jwt=${jwtToken}`;');
    console.log('\n3. Or use it in your livestream component:');
    console.log('   <JitsiMeetComponent');
    console.log('     roomName="your-room"');
    console.log(`   jwt="${TEST_JWT_TOKEN}"`);
    console.log('   />');
    
    console.log('\n📝 Token Summary:');
    console.log(`   ✅ Valid JWT format`);
    console.log(`   ✅ Contains user context`);
    console.log(`   ✅ Moderator permissions: ${decoded.payload.context?.user?.moderator}`);
    console.log(`   ✅ Room access: ${decoded.payload.room}`);
    console.log(`   ${now < exp ? '✅ Not expired' : '❌ Expired'}`);
    
  } catch (error) {
    console.log('❌ Error testing JWT token:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testJWTToken().catch(console.error);
}

module.exports = { testJWTToken };
