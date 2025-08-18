const fetch = require('node-fetch');

async function debugJitsiIssue() {
  console.log('🔍 Debugging Jitsi Video Streaming Issue\n');

  // Test 1: Check if the issue is with the room parameter
  console.log('1. Testing room parameter handling...');
  const testRooms = [
    'test-room',
    'prayer-room',
    'bible-study',
    'worship-session'
  ];

  for (const room of testRooms) {
    try {
      const response = await fetch(`https://stream.biblenow.io/live?room=${room}`);
      const content = await response.text();
      
      console.log(`   Room: ${room}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content Length: ${content.length} bytes`);
      
      // Check if it's returning HTML instead of video interface
      if (content.includes('<html') && content.includes('</html>')) {
        console.log(`   ⚠️  Returning HTML instead of video interface`);
        
        // Check for specific error indicators
        if (content.includes('error') || content.includes('Error')) {
          console.log(`   ❌ Error detected in HTML content`);
        }
        
        if (content.includes('JitsiMeetExternalAPI')) {
          console.log(`   ✅ Jitsi API reference found`);
        } else {
          console.log(`   ❌ No Jitsi API reference found`);
        }
      } else {
        console.log(`   ✅ Not returning HTML (might be video interface)`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error testing room ${room}: ${error.message}`);
    }
  }

  // Test 2: Check if the issue is with the Jitsi domain configuration
  console.log('2. Testing Jitsi domain configuration...');
  try {
    const response = await fetch('https://stream.biblenow.io/config.js');
    console.log(`   Config.js Status: ${response.status}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ Config.js accessible (${content.length} bytes)`);
      if (content.includes('domain') || content.includes('host')) {
        console.log(`   ✅ Configuration content detected`);
      }
    } else {
      console.log(`   ❌ Config.js not accessible`);
    }
  } catch (error) {
    console.log(`   ❌ Error accessing config.js: ${error.message}`);
  }

  // Test 3: Check if there's a specific issue with the external API
  console.log('\n3. Testing external API functionality...');
  try {
    const response = await fetch('https://stream.biblenow.io/external_api.js');
    const content = await response.text();
    
    // Check if the external API contains the expected Jitsi functions
    const expectedFunctions = [
      'JitsiMeetExternalAPI',
      'createElement',
      'appendChild',
      'iframe'
    ];
    
    console.log(`   External API size: ${content.length} bytes`);
    
    for (const func of expectedFunctions) {
      if (content.includes(func)) {
        console.log(`   ✅ ${func} found`);
      } else {
        console.log(`   ❌ ${func} not found`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error testing external API: ${error.message}`);
  }

  // Test 4: Check if the issue is with the proxy configuration
  console.log('\n4. Testing proxy configuration...');
  try {
    const response = await fetch('http://localhost:3001/live/test-room');
    console.log(`   Local proxy Status: ${response.status}`);
    console.log(`   Local proxy Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.ok) {
      const content = await response.text();
      console.log(`   ✅ Local proxy working (${content.length} bytes)`);
      if (content.includes('JitsiMeetExternalAPI')) {
        console.log(`   ✅ Jitsi API found in proxy response`);
      } else {
        console.log(`   ❌ No Jitsi API in proxy response`);
      }
    } else {
      console.log(`   ❌ Local proxy not working`);
    }
  } catch (error) {
    console.log(`   ❌ Error testing local proxy: ${error.message}`);
  }

  console.log('\n🏁 Jitsi issue debugging completed');
  console.log('\n💡 Potential Solutions:');
  console.log('1. Check if Jitsi server is properly configured');
  console.log('2. Verify room parameter handling');
  console.log('3. Check if there are any CORS or CSP issues');
  console.log('4. Verify the external API script is loading correctly');
  console.log('5. Check browser console for JavaScript errors');
}

debugJitsiIssue().catch(console.error); 