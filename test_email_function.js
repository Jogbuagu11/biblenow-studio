// Test the send-streaming-limit-email function
const testEmailFunction = async () => {
  const testData = {
    user_id: 'test-user-123',
    email: 'test@example.com',
    first_name: 'Test User',
    type: 'warning',
    usage_percentage: 75,
    remaining_minutes: 25,
    reset_date: '2025-01-20'
  };

  try {
    console.log('🧪 Testing send-streaming-limit-email function...');
    console.log('📧 Test data:', testData);

    const response = await fetch('https://jhlawjmyorpmafokxtuh.supabase.co/functions/v1/send-streaming-limit-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobGF3am15b3JwbWFmb2t4dHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzQ4NzQsImV4cCI6MjA1MDU1MDg3NH0.8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('📊 Response status:', response.status);
    console.log('📊 Response body:', result);
    
    if (response.ok) {
      console.log('✅ Function test successful!');
    } else {
      console.log('❌ Function test failed!');
    }
  } catch (error) {
    console.error('💥 Error testing function:', error);
  }
};

// Run the test
testEmailFunction();



