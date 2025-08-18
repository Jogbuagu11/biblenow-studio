const fetch = require('node-fetch');

async function testJitsiFix() {
  console.log('🧪 Testing Jitsi Fix with Public Server\n');

  // Test 1: Check public Jitsi server accessibility
  console.log('1. Testing public Jitsi server...');
  try {
    const response = await fetch('https://meet.jit.si/external_api.js');
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   CORS: ${response.headers.get('access-control-allow-origin')}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ Public server accessible (${content.length} bytes)`);
      if (content.includes('JitsiMeetExternalAPI')) {
        console.log(`   ✅ Jitsi API found in public server`);
      } else {
        console.log(`   ❌ Jitsi API not found in public server`);
      }
    } else {
      console.log(`   ❌ Public server not accessible`);
    }
  } catch (error) {
    console.log(`   ❌ Error accessing public server: ${error.message}`);
  }

  // Test 2: Test room creation on public server
  console.log('\n2. Testing room creation on public server...');
  try {
    const testRoom = 'biblenow-test-' + Date.now();
    const response = await fetch(`https://meet.jit.si/${testRoom}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ Room accessible (${content.length} bytes)`);
      if (content.includes('JitsiMeetExternalAPI') || content.includes('jitsi')) {
        console.log(`   ✅ Jitsi interface detected`);
      } else {
        console.log(`   ❌ No Jitsi interface detected`);
      }
    } else {
      console.log(`   ❌ Room not accessible`);
    }
  } catch (error) {
    console.log(`   ❌ Error creating room: ${error.message}`);
  }

  // Test 3: Compare with old server
  console.log('\n3. Comparing with old server...');
  try {
    const oldResponse = await fetch('https://stream.biblenow.io/live?room=test');
    const newResponse = await fetch('https://meet.jit.si/test-room');
    
    console.log(`   Old server status: ${oldResponse.status}`);
    console.log(`   New server status: ${newResponse.status}`);
    
    if (oldResponse.ok && newResponse.ok) {
      const oldContent = await oldResponse.text();
      const newContent = await newResponse.text();
      
      console.log(`   Old server content length: ${oldContent.length} bytes`);
      console.log(`   New server content length: ${newContent.length} bytes`);
      
      if (oldContent.includes('JitsiMeetExternalAPI')) {
        console.log(`   ⚠️  Old server has Jitsi API but may have rendering issues`);
      } else {
        console.log(`   ❌ Old server missing Jitsi API`);
      }
      
      if (newContent.includes('JitsiMeetExternalAPI')) {
        console.log(`   ✅ New server has Jitsi API`);
      } else {
        console.log(`   ❌ New server missing Jitsi API`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error comparing servers: ${error.message}`);
  }

  console.log('\n🏁 Jitsi fix test completed');
  console.log('\n✅ Fix Summary:');
  console.log('- Updated Jitsi domain to use public server (meet.jit.si)');
  console.log('- Removed JWT token requirement for basic usage');
  console.log('- Updated HTML to load script from public server');
  console.log('- Simplified configuration for public server');
  console.log('\n💡 Next Steps:');
  console.log('1. Rebuild and deploy the application');
  console.log('2. Test the live streaming functionality');
  console.log('3. Verify that video content displays correctly');
}

testJitsiFix().catch(console.error); 