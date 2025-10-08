// Manual test of the email edge function
// Run this in your browser console while on your app

console.log('🧪 Testing email edge function manually...');

// Test the edge function directly
async function testEmailFunction() {
  try {
    const { data, error } = await supabase.functions.invoke('send-streaming-limit-email', {
      body: {
        user_id: '29a4414e-d60f-42c1-bbfd-9166f17211a0',
        email: 'test@example.com', // Replace with actual email
        first_name: 'Test User',
        type: 'warning',
        usage_percentage: 75,
        remaining_minutes: 300,
        reset_date: '2025-10-13'
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
    } else {
      console.log('✅ Edge function success:', data);
    }
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

// Test the NotificationService directly
async function testNotificationService() {
  try {
    console.log('🔄 Testing NotificationService...');
    
    // Import NotificationService (adjust if needed)
    const { NotificationService } = await import('./src/services/notificationService.js');
    
    // Process notifications manually
    await NotificationService.processStreamingLimitNotifications();
    
    console.log('✅ NotificationService test completed');
  } catch (err) {
    console.error('❌ NotificationService error:', err);
  }
}

// Run both tests
console.log('Running tests...');
testEmailFunction();
testNotificationService();
