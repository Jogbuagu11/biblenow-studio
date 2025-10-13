// Test create-stream function to check if logs are appearing
// Run this in your browser console on the BibleNOW Studio app

async function testCreateStreamLogs() {
  console.log('🧪 Testing Create-Stream Function Logs\n');

  try {
    // Check if we're in the right environment
    if (typeof window === 'undefined') {
      console.error('❌ This test must be run in a browser environment');
      return;
    }

    // Check if Supabase is available
    if (!window.supabase) {
      console.error('❌ Supabase client not found. Make sure you\'re on the BibleNOW Studio app');
      return;
    }

    const supabase = window.supabase;

    // Step 1: Check current user
    console.log('1️⃣ Checking current user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ No authenticated user found. Please log in first.');
      return;
    }

    console.log(`✅ User authenticated: ${user.email} (${user.id})`);

    // Step 2: Test create-stream function with detailed logging
    console.log('\n2️⃣ Testing create-stream function...');
    
    const testStreamData = {
      title: 'Test Stream for Logs - ' + new Date().toLocaleTimeString(),
      description: 'This is a test stream to check if create-stream function logs are working properly.',
      platform: 'biblenow_video',
      stream_type: 'video',
      stream_mode: 'solo',
      room_name: 'test-logs-' + Date.now()
    };

    console.log('📺 Test stream data:', testStreamData);
    console.log('🌐 Calling create-stream function...');

    try {
      const { data: result, error: functionError } = await supabase.functions.invoke(
        'create-stream',
        { 
          body: {
            userId: user.id,
            streamData: testStreamData
          }
        }
      );

      console.log('📡 Function response received');
      console.log('📊 Response status:', functionError ? 'ERROR' : 'SUCCESS');
      
      if (functionError) {
        console.error('❌ Function call failed:', functionError);
        console.error('❌ Error details:', JSON.stringify(functionError, null, 2));
      } else {
        console.log('✅ Function call successful!');
        console.log('📊 Results:', JSON.stringify(result, null, 2));
      }

    } catch (functionError) {
      console.error('❌ Error calling create-stream function:', functionError);
      console.error('❌ Error stack:', functionError.stack);
    }

    // Step 3: Check if function was called by looking at recent streams
    console.log('\n3️⃣ Checking recent streams...');
    
    try {
      const { data: recentStreams, error: streamsError } = await supabase
        .from('livestreams')
        .select('*')
        .eq('streamer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (streamsError) {
        console.error('❌ Error fetching recent streams:', streamsError);
      } else {
        console.log(`✅ Found ${recentStreams?.length || 0} recent streams:`);
        recentStreams?.forEach((stream, index) => {
          console.log(`   ${index + 1}. ${stream.title}`);
          console.log(`      ID: ${stream.id}`);
          console.log(`      Room: ${stream.room_name}`);
          console.log(`      Created: ${new Date(stream.created_at).toLocaleString()}`);
          console.log(`      Status: ${stream.status}`);
        });
      }
    } catch (streamsError) {
      console.error('❌ Error checking recent streams:', streamsError);
    }

    // Step 4: Check notifications
    console.log('\n4️⃣ Checking notifications...');
    
    try {
      const { data: notifications, error: notificationsError } = await supabase
        .from('studio_notifications')
        .select('*')
        .eq('type', 'livestream_notification_email')
        .order('created_at', { ascending: false })
        .limit(3);

      if (notificationsError) {
        console.error('❌ Error fetching notifications:', notificationsError);
      } else {
        console.log(`✅ Found ${notifications?.length || 0} recent email notifications:`);
        notifications?.forEach((notification, index) => {
          console.log(`   ${index + 1}. ${notification.title}`);
          console.log(`      User: ${notification.user_id}`);
          console.log(`      Time: ${new Date(notification.created_at).toLocaleString()}`);
        });
      }
    } catch (notificationsError) {
      console.error('❌ Error checking notifications:', notificationsError);
    }

    // Step 5: Check in-app notifications
    console.log('\n5️⃣ Checking in-app notifications...');
    
    try {
      const { data: inAppNotifications, error: inAppError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'streamer_live')
        .order('created_at', { ascending: false })
        .limit(3);

      if (inAppError) {
        console.error('❌ Error fetching in-app notifications:', inAppError);
      } else {
        console.log(`✅ Found ${inAppNotifications?.length || 0} recent in-app notifications:`);
        inAppNotifications?.forEach((notification, index) => {
          console.log(`   ${index + 1}. ${notification.title}`);
          console.log(`      Body: ${notification.body}`);
          console.log(`      Time: ${new Date(notification.created_at).toLocaleString()}`);
        });
      }
    } catch (inAppError) {
      console.error('❌ Error checking in-app notifications:', inAppError);
    }

    console.log('\n🎉 Create-stream function test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication verified');
    console.log('   ✅ Function call attempted');
    console.log('   ✅ Recent streams checked');
    console.log('   ✅ Email notifications checked');
    console.log('   ✅ In-app notifications checked');

    console.log('\n🔍 Debugging Tips:');
    console.log('   1. Check Supabase Dashboard > Functions > create-stream for logs');
    console.log('   2. Look for console.log messages in the function logs');
    console.log('   3. Check if the function is being called at all');
    console.log('   4. Verify environment variables are set correctly');
    console.log('   5. Check if there are any CORS or authentication issues');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Instructions for running the test
console.log('📖 Create-Stream Function Logs Test Instructions:');
console.log('1. Open the BibleNOW Studio app in your browser');
console.log('2. Log in to your account');
console.log('3. Open the browser developer console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Run: testCreateStreamLogs()');
console.log('\n🚀 Ready to test! Run: testCreateStreamLogs()');
