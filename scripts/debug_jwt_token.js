#!/usr/bin/env node

/**
 * Debug JWT Token for Livestream
 * Comprehensive analysis of the provided JWT token
 */

const jwt = require('jsonwebtoken');

// The JWT token you provided
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpVCJ9.eyJhdWQiOiJiaWJsZW5vd19saXZlX2FwcCIsImlzcyI6ImJpYmxlbm93X2xpdmVfYXBwIiwic3ViIjoidXNlckBleGFtcGxlLmNvbSIsInJvb20iOiIqIiwiY29udGV4dCI6eyJ1c2VyIjp7ImlkIjoidXNlci1pZCIsIm5hbWUiOiJoYXJlc2giLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJtb2RlcmF0b3IiOnRydWV9fSwiZXhwIjoxNzkxMDI0MDI4LCJuYmYiOjE3MDAwMDAwMDB9.VZCAD63OEcVlwVZmEoOudqiYi06ylxpFsAPrNtkHuqg';

function debugJWTToken() {
  console.log('🔍 Debugging JWT Token for Livestream');
  console.log('=====================================\n');
  
  console.log('📋 Raw Token:');
  console.log(`   ${TEST_JWT_TOKEN}`);
  console.log(`   Length: ${TEST_JWT_TOKEN.length} characters`);
  
  // Check if it's a valid JWT format (3 parts separated by dots)
  const parts = TEST_JWT_TOKEN.split('.');
  console.log(`\n🔍 Token Structure: ${parts.length} parts`);
  
  if (parts.length !== 3) {
    console.log('❌ Invalid JWT format - should have 3 parts separated by dots');
    return;
  }
  
  console.log(`   Header: ${parts[0].length} chars`);
  console.log(`   Payload: ${parts[1].length} chars`);
  console.log(`   Signature: ${parts[2].length} chars`);
  
  // Decode each part
  try {
    console.log('\n📋 Decoded Header:');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    console.log(`   ${JSON.stringify(header, null, 2)}`);
    
    console.log('\n📋 Decoded Payload:');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    console.log(`   ${JSON.stringify(payload, null, 2)}`);
    
    // Analyze the payload
    console.log('\n🔍 Payload Analysis:');
    console.log(`   Audience (aud): ${payload.aud}`);
    console.log(`   Issuer (iss): ${payload.iss}`);
    console.log(`   Subject (sub): ${payload.sub}`);
    console.log(`   Room: ${payload.room}`);
    console.log(`   User ID: ${payload.context?.user?.id}`);
    console.log(`   User Name: ${payload.context?.user?.name}`);
    console.log(`   User Email: ${payload.context?.user?.email}`);
    console.log(`   Moderator: ${payload.context?.user?.moderator}`);
    
    // Check timing
    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp;
    const nbf = payload.nbf;
    
    console.log('\n⏰ Timing Analysis:');
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
    
    // Check if this matches your Jitsi configuration
    console.log('\n🎯 Jitsi Configuration Check:');
    console.log(`   Expected aud: biblenow (from your config)`);
    console.log(`   Token aud: ${payload.aud}`);
    console.log(`   Match: ${payload.aud === 'biblenow' ? '✅' : '❌'}`);
    
    console.log(`   Expected iss: biblenow (from your config)`);
    console.log(`   Token iss: ${payload.iss}`);
    console.log(`   Match: ${payload.iss === 'biblenow' ? '✅' : '❌'}`);
    
    // Test with your production endpoint
    console.log('\n🌐 Testing Production Endpoint:');
    testProductionEndpoint();
    
  } catch (error) {
    console.log('❌ Error decoding JWT:', error.message);
    console.log('   This might be due to invalid base64url encoding');
  }
}

async function testProductionEndpoint() {
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
      
      // Compare with your token
      if (data.jwt) {
        console.log('\n🔄 Comparing with Production Token:');
        const prodDecoded = jwt.decode(data.jwt, { complete: true });
        if (prodDecoded) {
          console.log(`   Production aud: ${prodDecoded.payload.aud}`);
          console.log(`   Production iss: ${prodDecoded.payload.iss}`);
          console.log(`   Production room: ${prodDecoded.payload.room}`);
        }
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Production endpoint error: ${errorText}`);
    }
  } catch (endpointError) {
    console.log(`   ❌ Endpoint test failed: ${endpointError.message}`);
  }
}

// Run the debug
if (require.main === module) {
  debugJWTToken();
}

module.exports = { debugJWTToken };
