const fetch = require('node-fetch');

async function testMojibakeFix() {
  const testUrls = [
    'http://localhost:3001/live/test-room',
    'http://localhost:3001/live/another-room',
    'http://localhost:3001/live'
  ];
  
  console.log('🧪 Testing Mojibake Fix\n');
  
  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'BibleNOW-Test/1.0'
        }
      });
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      console.log(`  Content-Encoding: ${response.headers.get('content-encoding') || 'none'}`);
      
      // Get the first 200 characters of the response
      const text = await response.text();
      const preview = text.substring(0, 200);
      
      // Check for mojibake indicators
      const hasMojibake = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(preview);
      const hasGzipHeaders = /gzip|deflate|br/.test(response.headers.get('content-encoding') || '');
      const isHtml = /<!doctype html|<html/i.test(preview);
      
      if (hasMojibake) {
        console.log('  ❌ MOJIBAKE DETECTED - Binary content being rendered as text');
      } else if (hasGzipHeaders) {
        console.log('  ⚠️  GZIP HEADERS DETECTED - May cause issues');
      } else if (isHtml) {
        console.log('  ✅ Proper HTML content detected');
      } else {
        console.log('  ⚠️  Unknown content type');
      }
      
      console.log(`  Preview: ${preview.replace(/\s+/g, ' ').substring(0, 100)}...`);
      console.log('');
      
    } catch (error) {
      console.error(`  ❌ Error testing ${url}:`, error.message);
      console.log('');
    }
  }
  
  console.log('🎯 Test Summary:');
  console.log('- If you see "✅ Proper HTML content detected" for all URLs, the fix is working');
  console.log('- If you see "❌ MOJIBAKE DETECTED", the fix is not working');
  console.log('- If you see "⚠️  GZIP HEADERS DETECTED", there may still be compression issues');
}

testMojibakeFix(); 