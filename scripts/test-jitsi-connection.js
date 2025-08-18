const fetch = require('node-fetch');

async function testJitsiConnection() {
  console.log('🧪 Testing Jitsi Connection\n');

  // Test 1: Check if external_api.js is accessible
  console.log('1. Testing external_api.js accessibility...');
  try {
    const response = await fetch('https://stream.biblenow.io/external_api.js');
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Content-Length: ${response.headers.get('content-length')}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ Script accessible (${content.length} bytes)`);
      console.log(`   First 100 chars: ${content.substring(0, 100)}...`);
    } else {
      console.log(`   ❌ Script not accessible`);
    }
  } catch (error) {
    console.log(`   ❌ Error accessing script: ${error.message}`);
  }

  // Test 2: Check if Jitsi domain is responding
  console.log('\n2. Testing Jitsi domain response...');
  try {
    const response = await fetch('https://stream.biblenow.io/');
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ Domain responding (${content.length} bytes)`);
      if (content.includes('Jitsi') || content.includes('jitsi')) {
        console.log(`   ✅ Jitsi-related content detected`);
      } else {
        console.log(`   ⚠️  No Jitsi-related content found`);
      }
    } else {
      console.log(`   ❌ Domain not responding properly`);
    }
  } catch (error) {
    console.log(`   ❌ Error accessing domain: ${error.message}`);
  }

  // Test 3: Test a specific room endpoint
  console.log('\n3. Testing room endpoint...');
  try {
    const testRoom = 'test-room-' + Date.now();
    const response = await fetch(`https://stream.biblenow.io/live?room=${testRoom}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ Room endpoint accessible (${content.length} bytes)`);
      if (content.includes('JitsiMeetExternalAPI') || content.includes('jitsi')) {
        console.log(`   ✅ Jitsi interface detected`);
      } else {
        console.log(`   ⚠️  No Jitsi interface detected`);
        console.log(`   First 200 chars: ${content.substring(0, 200)}...`);
      }
    } else {
      console.log(`   ❌ Room endpoint not accessible`);
    }
  } catch (error) {
    console.log(`   ❌ Error accessing room endpoint: ${error.message}`);
  }

  // Test 4: Check for CORS headers
  console.log('\n4. Testing CORS configuration...');
  try {
    const response = await fetch('https://stream.biblenow.io/external_api.js', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://studio.biblenow.io',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
    
    if (response.headers.get('access-control-allow-origin')) {
      console.log(`   ✅ CORS headers present`);
    } else {
      console.log(`   ⚠️  No CORS headers detected`);
    }
  } catch (error) {
    console.log(`   ❌ Error testing CORS: ${error.message}`);
  }

  console.log('\n🏁 Jitsi connection test completed');
}

testJitsiConnection().catch(console.error); 