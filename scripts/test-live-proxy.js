const fetch = require('node-fetch');

async function testLiveProxy() {
  const baseUrl = process.env.TEST_URL || 'http://localhost:3001';
  const testRoom = 'test-room-123';
  
  console.log(`Testing live proxy at: ${baseUrl}/live/${testRoom}`);
  
  try {
    const response = await fetch(`${baseUrl}/live/${testRoom}`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'BibleNOW-Test/1.0'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Encoding: ${response.headers.get('content-encoding')}`);
    console.log(`Content-Length: ${response.headers.get('content-length')}`);
    
    // Get the first 500 characters of the response to check for mojibake
    const text = await response.text();
    const preview = text.substring(0, 500);
    
    console.log('\nResponse preview (first 500 chars):');
    console.log('='.repeat(50));
    console.log(preview);
    console.log('='.repeat(50));
    
    // Check for mojibake indicators
    const hasMojibake = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(preview);
    const hasGzipHeaders = /gzip|deflate|br/.test(response.headers.get('content-encoding') || '');
    
    if (hasMojibake) {
      console.log('\n❌ MOJIBAKE DETECTED - Binary content being rendered as text');
    } else if (hasGzipHeaders) {
      console.log('\n⚠️  GZIP HEADERS DETECTED - May cause issues');
    } else {
      console.log('\n✅ No mojibake detected - Response appears to be proper text');
    }
    
  } catch (error) {
    console.error('Error testing live proxy:', error);
  }
}

testLiveProxy(); 