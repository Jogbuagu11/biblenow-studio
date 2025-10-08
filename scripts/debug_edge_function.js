// Debug the edge function call step by step
// Copy and paste this into your browser console while your React app is running

console.log('🔍 Debugging edge function call...');

async function debugEdgeFunction() {
  try {
    console.log('1️⃣ Checking Supabase client...');
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase client not available');
      return;
    }
    console.log('✅ Supabase client available');

    console.log('2️⃣ Checking for unprocessed notifications...');
    const { data: notifications, error: fetchError } = await supabase
      .from('studio_notifications')
      .select('*')
      .in('type', ['streaming_limit_warning', 'streaming_limit_reached'])
      .is('processed_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      return;
    }

    console.log(`📋 Found ${notifications?.length || 0} unprocessed notifications:`, notifications);

    if (!notifications || notifications.length === 0) {
      console.log('ℹ️ No unprocessed notifications found');
      return;
    }

    // Test with the first notification
    const notification = notifications[0];
    const metadata = notification.metadata;

    console.log('3️⃣ Testing edge function with notification:', notification.id);
    console.log('📧 Email data:', {
      user_id: notification.user_id,
      email: metadata.email,
      first_name: metadata.first_name,
      type: metadata.notification_type,
      usage_percentage: metadata.usage_percentage,
      remaining_minutes: metadata.remaining_minutes,
      reset_date: metadata.reset_date
    });

    console.log('4️⃣ Calling edge function...');
    const { data: emailResult, error: emailError } = await supabase.functions.invoke(
      'send-streaming-limit-email',
      {
        body: {
          user_id: notification.user_id,
          email: metadata.email || 'test@example.com',
          first_name: metadata.first_name || 'Test User',
          type: metadata.notification_type,
          usage_percentage: metadata.usage_percentage,
          remaining_minutes: metadata.remaining_minutes,
          reset_date: metadata.reset_date
        }
      }
    );

    if (emailError) {
      console.error('❌ Edge function error:', emailError);
      console.log('🔍 Error details:', {
        message: emailError.message,
        status: emailError.status,
        statusText: emailError.statusText
      });
      
      // Common error fixes
      if (emailError.message?.includes('401')) {
        console.log('💡 Fix: This is an authentication error. Check your service role key.');
      } else if (emailError.message?.includes('404')) {
        console.log('💡 Fix: Edge function not found. Run: supabase functions deploy send-streaming-limit-email');
      } else if (emailError.message?.includes('500')) {
        console.log('💡 Fix: Server error in edge function. Check edge function logs.');
      }
    } else {
      console.log('✅ Edge function success:', emailResult);
      
      console.log('5️⃣ Marking notification as processed...');
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

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Also test edge function deployment
async function testEdgeFunctionDeployment() {
  console.log('6️⃣ Testing edge function deployment...');
  
  try {
    const { data, error } = await supabase.functions.invoke('send-streaming-limit-email', {
      body: {
        user_id: 'test-user-id',
        email: 'test@example.com',
        first_name: 'Test',
        type: 'warning',
        usage_percentage: 75,
        remaining_minutes: 300,
        reset_date: '2025-10-15'
      }
    });

    if (error) {
      console.error('❌ Edge function deployment test failed:', error);
    } else {
      console.log('✅ Edge function deployment test passed:', data);
    }
  } catch (err) {
    console.error('❌ Edge function deployment error:', err);
  }
}

// Run both tests
debugEdgeFunction().then(() => {
  testEdgeFunctionDeployment();
});

console.log('🏁 Debug script started. Check the logs above for results.');
