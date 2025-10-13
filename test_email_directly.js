// Test the send-streaming-limit-email function directly
// Run this in your browser console or Node.js

const testEmailFunction = async () => {
  try {
    console.log('🧪 Testing send-streaming-limit-email function...');
    
    const response = await fetch('https://jhlawjmyorpmafokxtuh.supabase.co/functions/v1/send-streaming-limit-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: '29a4414e-d60f-42c1-bbfd-9166f17211a0',
        type: 'streaming_limit_reached',
        reset_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
    });

    const result = await response.json();
    
    console.log('📧 Email function response:', {
      status: response.status,
      statusText: response.statusText,
      result: result
    });

    if (response.ok) {
      console.log('✅ Email function test successful!');
      console.log('📬 Check your email inbox for the streaming limit notification');
    } else {
      console.log('❌ Email function test failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error testing email function:', error);
  }
};

// Run the test
testEmailFunction();
