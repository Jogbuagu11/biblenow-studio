// Browser test for going live email notifications
// Run this in the browser console on the BibleNOW Studio app

async function testGoingLiveNotifications() {
  console.log('🧪 Testing Going Live Email Notifications\n');

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

    // Step 2: Check user profile and followers
    console.log('\n2️⃣ Checking user profile and followers...');
    const { data: profile, error: profileError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ User profile not found:', profileError);
      return;
    }

    console.log(`✅ Profile found: ${profile.first_name} ${profile.last_name}`);

    // Check followers
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
    }

    // Step 3: Test the notification function directly
    console.log('\n3️⃣ Testing notification function...');
    
    const testStream = {
      streamer_id: user.id,
      stream_id: 'test-stream-' + Date.now(),
      stream_title: 'Test Bible Study - ' + new Date().toLocaleTimeString(),
      stream_description: 'This is a test livestream to verify email notifications are working correctly. Join us for a spiritual journey!',
      stream_url: window.location.origin + '/live-stream?room=test-bible-study&title=Test+Bible+Study'
    };

    console.log('📧 Test stream data:', testStream);

    try {
      const { data: result, error: functionError } = await supabase.functions.invoke(
        'send-livestream-notification',
        { body: testStream }
      );

      if (functionError) {
        console.error('❌ Function call failed:', functionError);
        return;
      }

      console.log('✅ Notification function called successfully!');
      console.log('📊 Results:', result);

      if (result.success) {
        console.log(`📧 Notifications sent: ${result.notifications_sent}/${result.total_followers}`);
        if (result.errors && result.errors.length > 0) {
          console.log('⚠️  Errors:', result.errors);
        }
      } else {
        console.log('❌ Function returned failure:', result);
      }

    } catch (functionError) {
      console.error('❌ Error calling notification function:', functionError);
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
        console.log(`      Body: ${notification.body}`);
      });
    } else {
      console.log('⚠️  No email notifications found in logs');
    }

    // Step 5: Test email preferences
    console.log('\n5️⃣ Testing email preferences...');
    
    try {
      // Check if we can access email preferences
      const { data: emailPrefs, error: prefsError } = await supabase
        .from('verified_profiles')
        .select('email_preferences')
        .eq('id', user.id)
        .single();

      if (prefsError) {
        console.log('⚠️  Could not fetch email preferences:', prefsError.message);
      } else {
        console.log('📧 Current email preferences:', emailPrefs?.email_preferences || 'None set');
      }

    } catch (prefsError) {
      console.log('⚠️  Email preferences test failed:', prefsError);
    }

    console.log('\n🎉 Going live notification test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication verified');
    console.log('   ✅ User profile loaded');
    console.log('   ✅ Followers checked');
    console.log('   ✅ Notification function tested');
    console.log('   ✅ Notification logs reviewed');
    console.log('   ✅ Email preferences checked');

    console.log('\n📧 Next steps:');
    console.log('   1. Check your email inbox for notifications');
    console.log('   2. Check spam folder if no emails received');
    console.log('   3. Verify email template rendering');
    console.log('   4. Test with real stream creation');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Helper function to create test followers
async function createTestFollowers() {
  console.log('🔧 Creating test followers...');
  
  const supabase = window.supabase;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Please log in first');
    return;
  }

  // Get other users to follow this user
  const { data: otherUsers, error } = await supabase
    .from('verified_profiles')
    .select('id, first_name, last_name, email')
    .neq('id', user.id)
    .limit(3);

  if (error || !otherUsers || otherUsers.length === 0) {
    console.error('❌ No other users found to create test followers');
    return;
  }

  console.log(`Found ${otherUsers.length} potential followers`);

  for (const otherUser of otherUsers) {
    try {
      const { error: followError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: otherUser.id,
          following_id: user.id
        });

      if (followError) {
        console.log(`⚠️  Could not create follow for ${otherUser.first_name}: ${followError.message}`);
      } else {
        console.log(`✅ ${otherUser.first_name} ${otherUser.last_name} now follows you`);
      }
    } catch (error) {
      console.log(`⚠️  Error creating follow for ${otherUser.first_name}:`, error);
    }
  }
}

// Instructions
console.log('📖 Going Live Notification Test Instructions:');
console.log('1. Open the BibleNOW Studio app in your browser');
console.log('2. Log in to your account');
console.log('3. Open the browser developer console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Run: testGoingLiveNotifications()');
console.log('6. If you need test followers, run: createTestFollowers()');
console.log('\n🚀 Ready to test! Run: testGoingLiveNotifications()');
