#!/usr/bin/env node

/**
 * Test script for both Express and Next.js Jitsi JWT endpoints
 */

const fetch = require('node-fetch');

async function testBothEndpoints() {
  console.log('🧪 Testing Both Jitsi JWT Endpoints...\n');

  const endpoints = [
    {
      name: 'Express (Local)',
      url: 'http://localhost:3001/api/jitsi/token'
    },
    {
      name: 'Express (Render)',
      url: 'https://biblenow-studio-backend.onrender.com/api/jitsi/token'
    },
    {
      name: 'Next.js (Local)',
      url: 'http://localhost:3000/api/jitsi/token'
    }
  ];

  const testCases = [
    {
      name: 'Basic Room',
      payload: {
        room: 'test-room',
        name: 'Test User',
        email: 'test@biblenowstudio.com',
        moderator: false
      }
    },
    {
      name: 'Moderator Room',
      payload: {
        room: 'moderator-room',
        name: 'Test Moderator',
        email: 'moderator@biblenowstudio.com',
        moderator: true
      }
    },
    {
      name: 'Special Characters Room',
      payload: {
        room: 'unto-us-a-son-is-given',
        name: 'Special User',
        email: 'special@biblenowstudio.com',
        moderator: false
      }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`📍 Testing ${endpoint.name}:`);
    console.log(`   URL: ${endpoint.url}\n`);

    for (const testCase of testCases) {
      console.log(`   🧪 ${testCase.name}:`);
      
      try {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testCase.payload)
        });

        console.log(`      Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const data = await response.json();
          console.log(`      ✅ Success!`);
          console.log(`         JWT Length: ${data.jwt?.length || 0} characters`);
          console.log(`         Room: ${data.room}`);
          console.log(`         Expires: ${new Date(data.expires * 1000).toISOString()}`);
          
          // Decode JWT to verify structure
          if (data.jwt) {
            const tokenParts = data.jwt.split('.');
            if (tokenParts.length === 3) {
              try {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                console.log(`         JWT Claims:`);
                console.log(`           aud: ${payload.aud}`);
                console.log(`           iss: ${payload.iss}`);
                console.log(`           room: ${payload.room}`);
                console.log(`           sub: ${payload.sub || 'none'}`);
                console.log(`           moderator: ${payload.context?.user?.moderator}`);
              } catch (e) {
                console.log(`         ❌ Could not decode JWT payload`);
              }
            }
          }
        } else {
          const errorText = await response.text();
          console.log(`      ❌ Error: ${errorText}`);
        }
      } catch (error) {
        console.log(`      ❌ Network Error: ${error.message}`);
      }
      
      console.log('');
    }
  }

  console.log('📝 Test Summary:');
  console.log('   - Express local: Should work if server is running');
  console.log('   - Express Render: Should work if deployed with env vars');
  console.log('   - Next.js local: Should work if Next.js app is running');
  console.log('   - All endpoints should return the same JWT structure');
}

testBothEndpoints(); 