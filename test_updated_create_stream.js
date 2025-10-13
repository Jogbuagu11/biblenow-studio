// Test the updated create-stream function with email notifications
// Run this in your browser console on the BibleNOW Studio app

async function testUpdatedCreateStream() {
  console.log('🧪 Testing Updated Create-Stream Function with Email Notifications\n');

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

    // Step 2: Check followers
    console.log('\n2️⃣ Checking followers...');
    const { data: followers, error: followersError } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        verified_profiles!user_follows_follower_id_fkey (
          id, first_name, last_name, email, email_preferences
        )
      `)
      .eq('following_id', user.id);

    if (followersError) {
      console.error('❌ Error fetching followers:', followersError);
      return;
    }

    console.log(`✅ Found ${followers?.length || 0} followers`);
    if (followers && followers.length > 0) {
      followers.forEach((follow, index) => {
        const follower = follow.verified_profiles;
        const prefs = follower?.email_preferences || {};
        const notificationsEnabled = prefs.livestreamNotifications !== false;
        console.log(`   ${index + 1}. ${follower?.first_name} ${follower?.last_name} (${follower?.email})`);
        console.log(`      Notifications: ${notificationsEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      });
    } else {
      console.log('⚠️  No followers found. You need followers to test notifications.');
      console.log('   Create test accounts and have them follow this user.');
      return;
    }

    // Step 3: Test the create-stream function
    console.log('\n3️⃣ Testing create-stream function...');
    
    const testStreamData = {
      title: 'Test Bible Study - ' + new Date().toLocaleTimeString(),
      description: 'This is a test livestream to verify the updated email notification system with TSX template and debugging.',
      platform: 'biblenow_video',
      stream_type: 'video',
      stream_mode: 'solo',
      room_name: 'test-bible-study-' + Date.now()
    };

    console.log('📺 Test stream data:', testStreamData);

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

      if (functionError) {
        console.error('❌ Function call failed:', functionError);
        return;
      }

      console.log('✅ Create-stream function called successfully!');
      console.log('📊 Results:', result);

      if (result.success) {
        console.log(`📺 Stream created: ${result.data.title}`);
        console.log(`👥 Followers notified: ${result.followersNotified}`);
        console.log(`🔗 Room name: ${result.data.room_name}`);
        console.log(`🆔 Stream ID: ${result.data.id}`);
        
        if (result.debug) {
          console.log('🐛 Debug info:', result.debug);
        }
      } else {
        console.log('❌ Function returned failure:', result);
      }

    } catch (functionError) {
      console.error('❌ Error calling create-stream function:', functionError);
    }

    // Step 4: Check notification logs
    console.log('\n4️⃣ Checking notification logs...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('studio_notifications')
      .select('*')
      .eq('type', 'livestream_notification_email')
      .order('created_at', { ascending: false })
      .limit(5);

    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError);
      return;
    }

    if (notifications && notifications.length > 0) {
      console.log(`✅ Found ${notifications.length} recent email notifications:`);
      notifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.title}`);
        console.log(`      User: ${notification.user_id}`);
        console.log(`      Time: ${new Date(notification.created_at).toLocaleString()}`);
        console.log(`      Metadata:`, notification.metadata);
      });
    } else {
      console.log('⚠️  No email notifications found in logs');
    }

    // Step 5: Check in-app notifications
    console.log('\n5️⃣ Checking in-app notifications...');
    const { data: inAppNotifications, error: inAppError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'streamer_live')
      .order('created_at', { ascending: false })
      .limit(5);

    if (inAppError) {
      console.error('❌ Error fetching in-app notifications:', inAppError);
      return;
    }

    if (inAppNotifications && inAppNotifications.length > 0) {
      console.log(`✅ Found ${inAppNotifications.length} recent in-app notifications:`);
      inAppNotifications.forEach((notification, index) => {
        console.log(`   ${index + 1}. ${notification.title}`);
        console.log(`      Body: ${notification.body}`);
        console.log(`      Time: ${new Date(notification.created_at).toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No in-app notifications found');
    }

    console.log('\n🎉 Updated create-stream function test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication verified');
    console.log('   ✅ Followers checked');
    console.log('   ✅ Create-stream function tested');
    console.log('   ✅ Email notifications checked');
    console.log('   ✅ In-app notifications checked');

    console.log('\n📧 Next steps:');
    console.log('   1. Check your email inbox for notifications');
    console.log('   2. Check spam folder if no emails received');
    console.log('   3. Verify email template rendering');
    console.log('   4. Check function logs in Supabase dashboard');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Instructions for running the test
console.log('📖 Updated Create-Stream Function Test Instructions:');
console.log('1. Open the BibleNOW Studio app in your browser');
console.log('2. Log in to your account');
console.log('3. Open the browser developer console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Run: testUpdatedCreateStream()');
console.log('\n🚀 Ready to test! Run: testUpdatedCreateStream()');
