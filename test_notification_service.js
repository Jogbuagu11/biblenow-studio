// Test the notification service directly
// Run this in your browser console while on your app

const testNotificationService = async () => {
  try {
    console.log('🔔 Testing NotificationService...');
    
    // Import the notification service (adjust path if needed)
    const { NotificationService } = await import('./src/services/notificationService.ts');
    
    console.log('🔍 Calling processStreamingLimitNotifications...');
    await NotificationService.processStreamingLimitNotifications();
    
    console.log('✅ NotificationService test completed');
    
  } catch (error) {
    console.error('❌ Error testing NotificationService:', error);
  }
};

// Alternative: Test the email function directly
const testEmailFunction = async () => {
  try {
    console.log('📧 Testing email function directly...');
    
    const response = await fetch('https://jhlawjmyorpmafokxtuh.supabase.co/functions/v1/send-streaming-limit-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: '29a4414e-d60f-42c1-bbfd-9166f17211a0',
        type: 'streaming_limit_reached',
        reset_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    });

    const result = await response.json();
    
    console.log('📧 Email function response:', {
      status: response.status,
      result: result
    });

    if (response.ok) {
      console.log('✅ Email sent successfully! Check your inbox.');
    } else {
      console.log('❌ Email function failed:', result);
    }
    
  } catch (error) {
    console.error('❌ Error testing email function:', error);
  }
};

// Run both tests
console.log('🧪 Running notification and email tests...');
testEmailFunction();
// testNotificationService(); // Uncomment if you want to test the service too
