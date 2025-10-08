// Test the frontend email processing
// Copy and paste this into your browser console while your app is running

console.log('🧪 Testing frontend email processing...');

// Test 1: Check if NotificationService is available
try {
  console.log('1. Checking NotificationService availability...');
  
  // Try to access the service (adjust import path if needed)
  const testService = window.NotificationService || 
                     (await import('/src/services/notificationService.js')).NotificationService;
  
  if (testService) {
    console.log('✅ NotificationService found');
    
    // Test 2: Manually process notifications
    console.log('2. Processing streaming limit notifications...');
    await testService.processStreamingLimitNotifications();
    console.log('✅ Processing completed');
    
  } else {
    console.log('❌ NotificationService not found');
  }
} catch (error) {
  console.error('❌ Error testing NotificationService:', error);
  
  // Test 3: Direct Supabase test
  console.log('3. Testing direct Supabase access...');
  try {
    // Check if supabase is available
    if (typeof supabase !== 'undefined') {
      console.log('✅ Supabase client available');
      
      // Get unprocessed notifications
      const { data: notifications, error } = await supabase
        .from('studio_notifications')
        .select('*')
        .in('type', ['streaming_limit_warning', 'streaming_limit_reached'])
        .is('processed_at', null)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching notifications:', error);
      } else {
        console.log(`📋 Found ${notifications?.length || 0} unprocessed notifications:`, notifications);
        
        // Test 4: Try to send email for first notification
        if (notifications && notifications.length > 0) {
          const notification = notifications[0];
          const metadata = notification.metadata;
          
          console.log('4. Testing edge function call...');
          const { data: emailResult, error: emailError } = await supabase.functions.invoke(
            'send-streaming-limit-email',
            {
              body: {
                user_id: notification.user_id,
                email: metadata.email,
                first_name: metadata.first_name,
                type: metadata.notification_type,
                usage_percentage: metadata.usage_percentage,
                remaining_minutes: metadata.remaining_minutes,
                reset_date: metadata.reset_date
              }
            }
          );
          
          if (emailError) {
            console.error('❌ Email function error:', emailError);
          } else {
            console.log('✅ Email function success:', emailResult);
            
            // Mark as processed
            const { error: updateError } = await supabase
              .from('studio_notifications')
              .update({
                processed_at: new Date().toISOString(),
                metadata: {
                  ...metadata,
                  email_status: 'sent',
                  email_result: emailResult
                }
              })
              .eq('id', notification.id);
            
            if (updateError) {
              console.error('❌ Error updating notification:', updateError);
            } else {
              console.log('✅ Notification marked as processed');
            }
          }
        }
      }
    } else {
      console.log('❌ Supabase client not available');
    }
  } catch (directError) {
    console.error('❌ Direct test error:', directError);
  }
}

console.log('🏁 Test completed. Check the logs above for results.');
