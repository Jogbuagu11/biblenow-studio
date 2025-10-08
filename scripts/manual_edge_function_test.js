// Manual test of the edge function and notification processing
// Copy and paste this into your browser console while your React app is running

console.log('🧪 Testing edge function and notification processing...');

async function testCompleteFlow() {
  try {
    console.log('1️⃣ Checking for unprocessed notifications...');
    
    // Get unprocessed notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('studio_notifications')
      .select('*')
      .in('type', ['streaming_limit_warning', 'streaming_limit_reached'])
      .is('processed_at', null)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      return;
    }

    console.log(`📋 Found ${notifications?.length || 0} unprocessed notifications:`, notifications);

    if (!notifications || notifications.length === 0) {
      console.log('ℹ️ No unprocessed notifications found. Run the SQL test first.');
      return;
    }

    // Process each notification
    for (const notification of notifications) {
      console.log(`2️⃣ Processing notification ${notification.id}...`);
      
      const metadata = notification.metadata;
      
      // Test edge function call
      console.log('3️⃣ Calling edge function...');
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
        console.error('❌ Edge function error:', emailError);
        
        // Mark as failed
        const { error: updateError } = await supabase
          .from('studio_notifications')
          .update({
            processed_at: new Date().toISOString(),
            metadata: {
              ...metadata,
              email_status: 'failed',
              email_error: emailError.message
            }
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error('❌ Error updating notification:', updateError);
        } else {
          console.log('📝 Marked notification as failed');
        }
      } else {
        console.log('✅ Edge function success:', emailResult);
        
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

    console.log('4️⃣ Checking final status...');
    
    // Check final status
    const { data: finalCheck } = await supabase
      .from('studio_notifications')
      .select('*')
      .eq('user_id', '29a4414e-d60f-42c1-bbfd-9166f17211a0')
      .not('processed_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('📊 Recently processed notifications:', finalCheck);

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Also test if NotificationService is working automatically
async function testNotificationService() {
  try {
    console.log('5️⃣ Testing NotificationService...');
    
    // Try to access NotificationService
    if (window.NotificationService) {
      console.log('✅ NotificationService found on window');
      await window.NotificationService.processStreamingLimitNotifications();
    } else {
      console.log('ℹ️ NotificationService not on window, trying import...');
      // This might not work depending on your build setup
      console.log('💡 The NotificationService should be running automatically via App.tsx');
    }
  } catch (error) {
    console.error('❌ NotificationService test error:', error);
  }
}

// Run both tests
console.log('🚀 Starting tests...');
testCompleteFlow().then(() => {
  testNotificationService();
});
