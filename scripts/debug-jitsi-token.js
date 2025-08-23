#!/usr/bin/env node

/**
 * Debug script to examine JWT token structure and identify Jitsi authentication issues
 */

const fetch = require('node-fetch');

async function debugJitsiToken() {
  console.log('🔍 Debugging Jitsi JWT Token Structure...\n');

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  try {
    // Test with the same room name that's failing
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

    console.log('✅ JWT token generated');
    console.log(`   Token length: ${tokenData.token.length} characters`);
    console.log(`   Room: ${tokenData.room}`);
    
    // Decode and examine the token structure
    console.log('\n2️⃣ Examining JWT token structure...');
    
    const tokenParts = tokenData.token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Invalid JWT structure');
      return;
    }

    // Decode header
    try {
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
      console.log('   Header:', header);
    } catch (e) {
      console.log('   Could not decode header:', e.message);
    }

    // Decode payload
    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('\n   Payload:');
      console.log('     aud (audience):', payload.aud);
      console.log('     iss (issuer):', payload.iss);
      console.log('     sub (subject):', payload.sub);
      console.log('     room:', payload.room);
      console.log('     nbf (not before):', new Date(payload.nbf * 1000).toISOString());
      console.log('     exp (expires):', new Date(payload.exp * 1000).toISOString());
      console.log('     iat (issued at):', new Date(payload.iat * 1000).toISOString());
      
      if (payload.context && payload.context.user) {
        console.log('\n     User Context:');
        console.log('       id:', payload.context.user.id);
        console.log('       name:', payload.context.user.name);
        console.log('       moderator:', payload.context.user.moderator);
      }
      
      if (payload.context && payload.context.features) {
        console.log('\n     Features:');
        console.log('       screen-sharing:', payload.context.features['screen-sharing']);
        console.log('       livestreaming:', payload.context.features.livestreaming);
        console.log('       recording:', payload.context.features.recording);
      }
    } catch (e) {
      console.log('   Could not decode payload:', e.message);
    }

    console.log('\n3️⃣ Environment Variables Check:');
    console.log('   JITSI_JWT_APP_ID:', process.env.JITSI_JWT_APP_ID || 'NOT SET');
    console.log('   JITSI_JWT_SECRET:', process.env.JITSI_JWT_SECRET ? 'SET' : 'NOT SET');
    console.log('   JITSI_SUBJECT:', process.env.JITSI_SUBJECT || 'NOT SET');
    console.log('   JITSI_DOMAIN:', process.env.JITSI_DOMAIN || 'NOT SET');

    console.log('\n4️⃣ Potential Issues:');
    console.log('   - Check if Jitsi server expects different aud/iss/sub values');
    console.log('   - Verify room name format matches Jitsi server requirements');
    console.log('   - Ensure JWT secret matches between client and server');
    console.log('   - Check if Jitsi server is configured to accept JWT tokens');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugJitsiToken().catch(console.error); 