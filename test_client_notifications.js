// Client-side test for livestream notifications
// Run this in the browser console on the BibleNOW Studio app

async function testClientLivestreamNotifications() {
  console.log('🧪 Testing Client-Side Livestream Notifications\n');

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

    console.log(`✅ User authenticated: ${user.email}`);

    // Step 2: Check user profile
    console.log('\n2️⃣ Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email, email_preferences')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ User profile not found:', profileError);
      return;
    }

    console.log(`✅ Profile found: ${profile.first_name} ${profile.last_name}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Preferences:`, profile.email_preferences || 'None set');

    // Step 3: Check followers
    console.log('\n3️⃣ Checking followers...');
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
    }

    // Step 4: Test notification service
    console.log('\n4️⃣ Testing notification service...');
    
    // Import the notification service (this would need to be available in the browser)
    if (typeof LivestreamNotificationService === 'undefined') {
      console.log('⚠️  LivestreamNotificationService not available in browser context');
      console.log('   This is expected - the service is only available in the React app');
      return;
    }

    const testData = {
      streamer_id: user.id,
      stream_id: 'test-stream-' + Date.now(),
      stream_title: 'Test Livestream - ' + new Date().toLocaleTimeString(),
      stream_description: 'This is a test livestream to verify email notifications.',
      stream_url: window.location.origin + '/live-stream?room=test-room&title=Test+Stream'
    };

    console.log('📧 Test notification data:', testData);

    try {
      const result = await LivestreamNotificationService.notifyFollowersOfLivestream(testData);
      console.log('✅ Notification service test successful!');
      console.log('📊 Results:', result);
    } catch (serviceError) {
      console.error('❌ Notification service test failed:', serviceError);
    }

    // Step 5: Test email preferences update
    console.log('\n5️⃣ Testing email preferences update...');
    
    try {
      const currentPrefs = await LivestreamNotificationService.getEmailPreferences(user.id);
      console.log('📧 Current preferences:', currentPrefs);

      // Toggle livestream notifications
      const newValue = !currentPrefs.livestreamNotifications;
      await LivestreamNotificationService.updateEmailPreferences(user.id, {
        livestreamNotifications: newValue
      });

      console.log(`✅ Updated livestream notifications to: ${newValue}`);

      // Verify the change
      const updatedPrefs = await LivestreamNotificationService.getEmailPreferences(user.id);
      console.log('📧 Updated preferences:', updatedPrefs);

      // Revert the change
      await LivestreamNotificationService.updateEmailPreferences(user.id, {
        livestreamNotifications: currentPrefs.livestreamNotifications
      });

      console.log('✅ Reverted preferences to original state');

    } catch (prefsError) {
      console.error('❌ Email preferences test failed:', prefsError);
    }

    console.log('\n🎉 Client-side test completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication verified');
    console.log('   ✅ User profile loaded');
    console.log('   ✅ Followers checked');
    console.log('   ✅ Notification service tested');
    console.log('   ✅ Email preferences tested');

  } catch (error) {
    console.error('❌ Client test failed with error:', error);
  }
}

// Instructions for running the test
console.log('📖 Instructions:');
console.log('1. Open the BibleNOW Studio app in your browser');
console.log('2. Log in to your account');
console.log('3. Open the browser developer console (F12)');
console.log('4. Copy and paste this entire script');
console.log('5. Run: testClientLivestreamNotifications()');
console.log('\n🚀 Ready to test! Run: testClientLivestreamNotifications()');
