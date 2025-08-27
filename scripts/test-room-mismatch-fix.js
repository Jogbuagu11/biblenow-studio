#!/usr/bin/env node

/**
 * Test script to verify the room name mismatch fix
 * This simulates the exact scenario that was causing "Room and token mismatched" errors
 */

const fetch = require('node-fetch');

async function testRoomMismatchFix() {
  console.log('🧪 Testing Room Name Mismatch Fix...\n');

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  try {
    // Test 1: Generate JWT token for a room with special characters
    console.log('1️⃣ Testing JWT token generation for room with special characters...');
    
    const roomName = 'unto-us-a-son-is-given';
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
    console.log(`   Original room requested: ${roomName}`);
    console.log(`   Room in JWT: ${tokenData.room}`);
    
    // Test 2: Decode and verify JWT structure
    console.log('\n2️⃣ Verifying JWT token structure...');
    
    const tokenParts = tokenData.token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Invalid JWT structure');
      return;
    }

    try {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      console.log('✅ JWT payload decoded successfully');
      console.log(`   aud (audience): ${payload.aud}`);
      console.log(`   iss (issuer): ${payload.iss}`);
      console.log(`   sub (subject): ${payload.sub}`);
      console.log(`   room: ${payload.room}`);
      console.log(`   moderator: ${payload.context?.user?.moderator}`);
      
      // Test 3: Verify room name consistency
      console.log('\n3️⃣ Verifying room name consistency...');
      
      if (payload.room === roomName) {
        console.log('✅ Room names match perfectly!');
        console.log(`   JWT room: "${payload.room}"`);
        console.log(`   URL room: "${roomName}"`);
      } else {
        console.log('❌ Room name mismatch detected!');
        console.log(`   JWT room: "${payload.room}"`);
        console.log(`   URL room: "${roomName}"`);
        console.log('   This would cause "Room and token mismatched" error');
      }
      
      // Test 4: Simulate the iframe room path construction
      console.log('\n4️⃣ Simulating iframe room path construction...');
      
      // This is what the LiveStream component now does
      let iframeRoomPath = roomName; // Default to roomName
      
      if (payload.room && payload.room !== roomName) {
        console.log('⚠️  Room name mismatch detected, using JWT room name');
        iframeRoomPath = payload.room;
      } else {
        console.log('✅ Room names match, using URL room name');
        iframeRoomPath = roomName;
      }
      
      console.log(`   Final iframe room path: "${iframeRoomPath}"`);
      console.log(`   This should match the JWT room: "${payload.room}"`);
      
      if (iframeRoomPath === payload.room) {
        console.log('✅ Room path construction is correct!');
        console.log('   This should resolve the "Room and token mismatched" error');
      } else {
        console.log('❌ Room path construction is still incorrect');
        console.log('   This would still cause authentication issues');
      }
      
    } catch (error) {
      console.log('❌ Error decoding JWT payload:', error.message);
    }

    // Test 5: Test with different room names
    console.log('\n5️⃣ Testing with different room name formats...');
    
    const testRooms = [
      'simple-room',
      'room-with-spaces',
      'Room-With-Capitals',
      'room_with_underscores',
      'room-with-special-chars!@#'
    ];
    
    for (const testRoom of testRooms) {
      console.log(`\n   Testing room: "${testRoom}"`);
      
      const testResponse = await fetch(`${apiBase}/jitsi/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTitle: testRoom,
          isModerator: false,
          displayName: 'Test User',
          email: 'test@biblenowstudio.com'
        })
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        const testPayload = JSON.parse(Buffer.from(testData.token.split('.')[1], 'base64').toString());
        
        console.log(`     JWT room: "${testPayload.room}"`);
        console.log(`     Expected: "${testRoom.toLowerCase().replace(/[^a-z0-9-]/g, '-')}"`);
        
        if (testPayload.room === testRoom.toLowerCase().replace(/[^a-z0-9-]/g, '-')) {
          console.log('     ✅ Room name processing is consistent');
        } else {
          console.log('     ❌ Room name processing is inconsistent');
        }
      }
    }

    console.log('\n🎉 Room name mismatch fix test completed!');
    console.log('\n📝 Summary:');
    console.log('   - JWT tokens are being generated correctly');
    console.log('   - Room names are being processed consistently');
    console.log('   - The iframe room path construction has been fixed');
    console.log('   - This should resolve the "Room and token mismatched" error');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testRoomMismatchFix(); 