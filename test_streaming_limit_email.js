// Test script for send-streaming-limit-email function
const testEmailFunction = async () => {
  const testData = {
    user_id: 'test-user-id',
    email: 'test@example.com',
    first_name: 'Test User',
    type: 'warning',
    usage_percentage: 75,
    remaining_minutes: 25,
    reset_date: '2025-01-20'
  };

  try {
    const response = await fetch('https://jhlawjmyorpmafokxtuh.supabase.co/functions/v1/send-streaming-limit-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ANON_KEY'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
  } catch (error) {
    console.error('Error testing function:', error);
  }
};

testEmailFunction();

