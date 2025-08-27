#!/usr/bin/env node

/**
 * Test script to try different JWT configurations that the Jitsi server might expect
 * This will help identify the correct JWT format for your specific Jitsi server
 */

const fetch = require('node-fetch');

async function testJitsiServerConfig() {
  console.log('🔧 Testing Different JWT Configurations for Jitsi Server...\n');

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  const roomName = 'test-room';
  
  try {
    // Test 1: Standard configuration (current)
    console.log('1️⃣ Testing Standard Configuration...');
    const standardResponse = await fetch(`${apiBase}/jitsi/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTitle: roomName,
        isModerator: true,
        displayName: 'Test User',
        email: 'test@biblenowstudio.com'
      })
    });

    if (standardResponse.ok) {
      const standardData = await standardResponse.json();
      const standardPayload = JSON.parse(Buffer.from(standardData.token.split('.')[1], 'base64').toString());
      
      console.log('   ✅ Standard JWT generated');
      console.log('   aud:', standardPayload.aud);
      console.log('   iss:', standardPayload.iss);
      console.log('   sub:', standardPayload.sub);
      console.log('   room:', standardPayload.room);
      
      const standardURL = `https://stream.biblenow.io/${standardPayload.room}#jwt=${standardData.token}`;
      console.log('   Test URL:', standardURL);
    }

    console.log('\n2️⃣ Testing Alternative Configurations...');
    
    // Test different JWT configurations that might work
    const testConfigs = [
      {
        name: 'Alternative 1: Different aud/iss',
        description: 'Try different audience/issuer values',
        aud: 'jitsi',
        iss: 'jitsi'
      },
      {
        name: 'Alternative 2: No sub claim',
        description: 'Remove sub claim entirely',
        noSub: true
      },
      {
        name: 'Alternative 3: Different room format',
        description: 'Try room name with different format',
        roomFormat: 'test_room'
      }
    ];

    for (const config of testConfigs) {
      console.log(`\n   Testing: ${config.name}`);
      console.log(`   Description: ${config.description}`);
      
      // For now, we'll just show what we would test
      // In a real scenario, you'd modify the server endpoint to test these
      console.log('   (This would require server-side changes to test)');
    }

    console.log('\n3️⃣ Manual Testing Instructions:');
    console.log('   Since the JWT structure looks correct, try these manual tests:');
    console.log('');
    console.log('   A. Test with a simple room name:');
    console.log('      - Try room name: "test" instead of "unto-us-a-son-is-given"');
    console.log('      - URL: https://stream.biblenow.io/test#jwt=YOUR_TOKEN');
    console.log('');
    console.log('   B. Check Jitsi server logs:');
    console.log('      - Look for JWT validation errors in Jitsi server logs');
    console.log('      - Check if JWT secret matches between client and server');
    console.log('');
    console.log('   C. Verify Jitsi server configuration:');
    console.log('      - Ensure JWT authentication is enabled on Jitsi server');
    console.log('      - Check if the JWT secret matches your server/.env file');
    console.log('');
    console.log('   D. Test with different JWT claims:');
    console.log('      - Try removing the "sub" claim');
    console.log('      - Try different "aud" and "iss" values');
    console.log('      - Try different room name formats');

    console.log('\n4️⃣ Quick Fix to Try:');
    console.log('   If the issue persists, try this temporary fix in server/index.js:');
    console.log('');
    console.log('   // In the JWT payload, try removing the sub claim:');
    console.log('   const payload = {');
    console.log('     aud: APP_ID,');
    console.log('     iss: APP_ID,');
    console.log('     // sub: DOMAIN, // Comment out this line');
    console.log('     room,');
    console.log('     nbf: now - 5,');
    console.log('     exp: now + 3600,');
    console.log('     iat: now,');
    console.log('     context: { ... }');
    console.log('   };');

    console.log('\n5️⃣ Next Steps:');
    console.log('   1. Try the simple room name test first');
    console.log('   2. Check Jitsi server configuration and logs');
    console.log('   3. Verify JWT secret matches between client and server');
    console.log('   4. Try removing the sub claim temporarily');
    console.log('   5. Contact your Jitsi server administrator if needed');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testJitsiServerConfig(); 