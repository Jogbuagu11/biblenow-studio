// Test Streaming Limit Notification System
// Run this in your browser console to test the notification system

console.log('🧪 Testing Streaming Limit Notification System...');

// Test function to check if the new infrastructure is working
async function testNotificationInfrastructure() {
  try {
    console.log('🔍 Testing database functions...');
    
    // Test the streaming limit system
    const { data: testData, error: testError } = await supabase
      .rpc('test_streaming_limit_system');
    
    if (testError) {
      console.error('❌ Error testing streaming limit system:', testError);
      return false;
    }
    
    console.log('✅ Streaming limit system test results:', testData);
    
    // Test getting pending notifications
    const { data: pendingNotifications, error: pendingError } = await supabase
      .rpc('process_pending_streaming_notifications');
    
    if (pendingError) {
      console.error('❌ Error getting pending notifications:', pendingError);
      return false;
    }
    
    console.log('✅ Pending notifications:', pendingNotifications);
    
    // Test notification stats
    const { data: stats, error: statsError } = await supabase
      .from('streaming_limit_notifications')
      .select('type, email_sent, processed_at');
    
    if (statsError) {
      console.error('❌ Error getting notification stats:', statsError);
      return false;
    }
    
    console.log('✅ Notification stats:', {
      total: stats?.length || 0,
      pending: stats?.filter(n => !n.processed_at).length || 0,
      sent: stats?.filter(n => n.email_sent).length || 0,
      warnings: stats?.filter(n => n.type === 'warning').length || 0,
      reached: stats?.filter(n => n.type === 'reached').length || 0
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing notification infrastructure:', error);
    return false;
  }
}

// Test function to manually trigger a notification (for testing)
async function testManualNotification(userId) {
  try {
    console.log(`🧪 Testing manual notification for user: ${userId}`);
    
    // Import the notification service
    const { StreamingLimitNotificationService } = await import('./src/services/streamingLimitNotificationService.ts');
    
    const result = await StreamingLimitNotificationService.triggerNotificationCheck(userId);
    
    console.log('✅ Manual notification test result:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error testing manual notification:', error);
    return null;
  }
}

// Test function to process pending notifications
async function testProcessNotifications() {
  try {
    console.log('🧪 Testing notification processing...');
    
    // Import the notification service
    const { StreamingLimitNotificationService } = await import('./src/services/streamingLimitNotificationService.ts');
    
    const result = await StreamingLimitNotificationService.processPendingNotifications();
    
    console.log('✅ Notification processing test result:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error testing notification processing:', error);
    return null;
  }
}

// Test function to get user streaming usage
async function testGetUserUsage(userId) {
  try {
    console.log(`🧪 Testing user usage for: ${userId}`);
    
    // Import the notification service
    const { StreamingLimitNotificationService } = await import('./src/services/streamingLimitNotificationService.ts');
    
    const usage = await StreamingLimitNotificationService.getUserStreamingUsage(userId);
    
    console.log('✅ User usage test result:', usage);
    
    return usage;
    
  } catch (error) {
    console.error('❌ Error testing user usage:', error);
    return null;
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Running all notification system tests...');
  
  // Test 1: Infrastructure
  const infrastructureTest = await testNotificationInfrastructure();
  console.log(`Infrastructure test: ${infrastructureTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test 2: Get a test user ID
  const { data: testUser, error: userError } = await supabase
    .from('verified_profiles')
    .select('id')
    .limit(1)
    .single();
  
  if (userError || !testUser) {
    console.error('❌ Could not get test user:', userError);
    return;
  }
  
  console.log(`Using test user: ${testUser.id}`);
  
  // Test 3: User usage
  const usageTest = await testGetUserUsage(testUser.id);
  console.log(`User usage test: ${usageTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test 4: Manual notification
  const manualTest = await testManualNotification(testUser.id);
  console.log(`Manual notification test: ${manualTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Test 5: Process notifications
  const processTest = await testProcessNotifications();
  console.log(`Process notifications test: ${processTest ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('🎉 All tests completed!');
}

// Export functions for manual testing
window.testNotificationSystem = {
  runAllTests,
  testNotificationInfrastructure,
  testManualNotification,
  testProcessNotifications,
  testGetUserUsage
};

// Auto-run the tests
runAllTests();