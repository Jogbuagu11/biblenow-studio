#!/usr/bin/env node

/**
 * Debug script to show the exact URL being accessed vs JWT token room claim
 * This will help identify the root cause of the "Room and token mismatched" error
 */

const fetch = require('node-fetch');

async function debugActualURL() {
  console.log('🔍 Debugging Actual URL vs JWT Token Room Claim...\n');

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  try {
    // Test with the exact room name that's failing
    const roomName = 'unto-us-a-son-is-given';
    
    console.log('1️⃣ Generating JWT token for room:', roomName);
    
    const tokenResponse = await fetch(`${apiBase}/jitsi/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTitle: roomName,
        isModerator: true,
        displayName: 'Test Moderator',
        email: 'test@biblenowstudio.com'
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`HTTP ${tokenResponse.status}: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.token) {
      console.log('❌ No token received');
      return;
    }

    console.log('✅ JWT token generated successfully');
    
    // Decode the JWT token
    const tokenParts = tokenData.token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    console.log('\n2️⃣ JWT Token Analysis:');
    console.log('   aud (audience):', payload.aud);
    console.log('   iss (issuer):', payload.iss);
    console.log('   sub (subject):', payload.sub);
    console.log('   room:', payload.room);
    console.log('   exp:', new Date(payload.exp * 1000).toISOString());
    
    console.log('\n3️⃣ URL Construction Analysis:');
    
    // Simulate what the LiveStream component does
    const jitsiConfig = {
      domain: 'stream.biblenow.io'
    };
    
    // This is what the LiveStream component was doing BEFORE the fix
    const oldRoomPath = `${payload.sub}/${roomName}`;
    console.log('   OLD (problematic) room path:', oldRoomPath);
    console.log('   This would cause mismatch because:');
    console.log('     - JWT room claim:', payload.room);
    console.log('     - URL room name:', oldRoomPath);
    console.log('     - Mismatch: YES ❌');
    
    // This is what the LiveStream component does AFTER the fix
    let newRoomPath = roomName;
    if (payload.room && payload.room !== roomName) {
      newRoomPath = payload.room;
    }
    console.log('\n   NEW (fixed) room path:', newRoomPath);
    console.log('   This should work because:');
    console.log('     - JWT room claim:', payload.room);
    console.log('     - URL room name:', newRoomPath);
    console.log('     - Match:', payload.room === newRoomPath ? 'YES ✅' : 'NO ❌');
    
    console.log('\n4️⃣ Full Jitsi URL Construction:');
    const fullURL = `https://${jitsiConfig.domain}/${newRoomPath}#jwt=${tokenData.token}`;
    console.log('   Full URL:', fullURL);
    
    console.log('\n5️⃣ What Jitsi Server Expects:');
    console.log('   - Domain:', jitsiConfig.domain);
    console.log('   - Room in URL:', newRoomPath);
    console.log('   - Room in JWT:', payload.room);
    console.log('   - Sub claim:', payload.sub);
    
    console.log('\n6️⃣ Potential Issues:');
    
    // Check if sub claim matches domain
    if (payload.sub !== jitsiConfig.domain) {
      console.log('   ⚠️  Sub claim does not match domain:');
      console.log('      Sub claim:', payload.sub);
      console.log('      Domain:', jitsiConfig.domain);
    } else {
      console.log('   ✅ Sub claim matches domain');
    }
    
    // Check if room names match
    if (payload.room !== newRoomPath) {
      console.log('   ❌ Room name mismatch:');
      console.log('      JWT room:', payload.room);
      console.log('      URL room:', newRoomPath);
    } else {
      console.log('   ✅ Room names match');
    }
    
    // Check audience and issuer
    if (payload.aud !== 'biblenow' || payload.iss !== 'biblenow') {
      console.log('   ⚠️  Audience/Issuer mismatch:');
      console.log('      aud:', payload.aud);
      console.log('      iss:', payload.iss);
    } else {
      console.log('   ✅ Audience/Issuer are correct');
    }
    
    console.log('\n7️⃣ Recommendations:');
    
    if (payload.room === newRoomPath) {
      console.log('   ✅ Room names match - the fix should work');
      console.log('   📝 If you\'re still getting errors, check:');
      console.log('      1. Jitsi server configuration');
      console.log('      2. JWT secret matches between client and server');
      console.log('      3. Jitsi server is configured to accept JWT tokens');
    } else {
      console.log('   ❌ Room names still don\'t match');
      console.log('   📝 The fix may not be applied correctly');
    }
    
    console.log('\n8️⃣ Test URL to try:');
    console.log(`   ${fullURL}`);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  }
}

debugActualURL(); 