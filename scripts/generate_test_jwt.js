#!/usr/bin/env node

/**
 * Generate Test JWT Token for Livestream
 * Creates a valid JWT token for testing your livestream functionality
 */

const jwt = require('jsonwebtoken');

function generateTestJWT() {
  console.log('🔧 Generating Test JWT Token for Livestream');
  console.log('==========================================\n');
  
  // JWT configuration (matching your server setup)
  const JWT_SECRET = process.env.JWT_APP_SECRET || 'your_jwt_secret_here';
  const JITSI_AUD = 'biblenow';
  const JITSI_ISS = 'biblenow';
  const JITSI_SUB = 'stream.biblenow.io';
  
  console.log('📋 Configuration:');
  console.log(`   Secret: ${JWT_SECRET.substring(0, 10)}...`);
  console.log(`   Audience: ${JITSI_AUD}`);
  console.log(`   Issuer: ${JITSI_ISS}`);
  console.log(`   Subject: ${JITSI_SUB}`);
  
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT payload
  const payload = {
    aud: JITSI_AUD,
    iss: JITSI_ISS,
    sub: JITSI_SUB,
    room: '*', // Wildcard for room access
    nbf: now - 10, // 10 seconds before now
    exp: now + 3600, // 1 hour from now
    iat: now,
    context: {
      user: {
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        moderator: true
      }
    }
  };
  
  console.log('\n📋 JWT Payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    // Generate JWT token
    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
    
    console.log('\n✅ Generated JWT Token:');
    console.log(`   ${token}`);
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\n🔍 Token Verification:');
    console.log(`   ✅ Token is valid`);
    console.log(`   ✅ Audience: ${decoded.aud}`);
    console.log(`   ✅ Issuer: ${decoded.iss}`);
    console.log(`   ✅ Room: ${decoded.room}`);
    console.log(`   ✅ Moderator: ${decoded.context.user.moderator}`);
    console.log(`   ✅ Expires: ${new Date(decoded.exp * 1000).toISOString()}`);
    
    // Test with production endpoint
    console.log('\n🌐 Testing with Production Endpoint:');
    testWithProductionEndpoint(token);
    
    console.log('\n🚀 How to Use This Token:');
    console.log('1. Copy the JWT token above');
    console.log('2. Use it in your Jitsi iframe:');
    console.log(`   <iframe src="https://your-jitsi-domain.com/room-name?jwt=${token}"></iframe>`);
    console.log('\n3. Or use it in your React component:');
    console.log('   <JitsiMeetComponent');
    console.log('     roomName="your-room"');
    console.log(`   jwt="${token}"`);
    console.log('   />');
    
    return token;
    
  } catch (error) {
    console.log('❌ Error generating JWT:', error.message);
    console.log('💡 Make sure JWT_APP_SECRET is set in your environment');
    return null;
  }
}

async function testWithProductionEndpoint(token) {
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
      
      console.log('\n📋 Production JWT Token:');
      console.log(`   ${data.jwt}`);
      
      return data.jwt;
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Production endpoint error: ${errorText}`);
    }
  } catch (endpointError) {
    console.log(`   ❌ Endpoint test failed: ${endpointError.message}`);
  }
}

// Run the generator
if (require.main === module) {
  generateTestJWT();
}

module.exports = { generateTestJWT };
