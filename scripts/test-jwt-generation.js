const fetch = require('node-fetch');

async function testJWTGeneration() {
  console.log('Testing JWT token generation...');
  
  try {
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    console.log('API Base:', apiBase);
    
    const response = await fetch(`${apiBase}/jitsi/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTitle: 'test-room',
        isModerator: false,
        displayName: 'Test User',
        email: 'test@example.com'
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      console.log('✅ JWT token generated successfully!');
      console.log('Token length:', data.token.length);
      console.log('Room:', data.room);
      
      // Decode the token to see the payload (without verification)
      const tokenParts = data.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('Token payload:', JSON.stringify(payload, null, 2));
      }
    } else {
      console.log('❌ JWT token generation failed');
      console.log('Response:', data);
    }
  } catch (error) {
    console.error('❌ Error testing JWT generation:', error.message);
  }
}

testJWTGeneration(); 