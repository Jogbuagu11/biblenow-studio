// Test script to manually trigger email processing
// Run this in your browser console while the app is running

// Test if NotificationService is working
console.log('Testing NotificationService...');

// Import the service (adjust path if needed)
import { NotificationService } from '../src/services/notificationService.js';

// Manually trigger the email processing
async function testEmailProcessing() {
  console.log('🔄 Starting manual email processing test...');
  
  try {
    // Process streaming limit notifications
    await NotificationService.processStreamingLimitNotifications();
    console.log('✅ Email processing completed');
    
    // Check for unprocessed notifications
    const { data: unprocessed } = await supabase
      .from('studio_notifications')
      .select('*')
      .is('processed_at', null)
      .in('type', ['streaming_limit_warning', 'streaming_limit_reached']);
    
    console.log('📋 Unprocessed notifications:', unprocessed);
    
    // Check for processed notifications
    const { data: processed } = await supabase
      .from('studio_notifications')
      .select('*')
      .not('processed_at', 'is', null)
      .in('type', ['streaming_limit_warning', 'streaming_limit_reached'])
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('✅ Recently processed notifications:', processed);
    
  } catch (error) {
    console.error('❌ Error in email processing test:', error);
  }
}

// Run the test
testEmailProcessing();
