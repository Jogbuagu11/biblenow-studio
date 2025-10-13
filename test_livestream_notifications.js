// Test script for livestream notifications
// This script tests the email notification system when a streamer starts a livestream

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://jhlawjmyorpmafokxtuh.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ REACT_APP_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLivestreamNotifications() {
  console.log('🧪 Testing Livestream Notifications System\n');

  try {
    // Step 1: Check if we have test users
    console.log('1️⃣ Checking for test users...');
    const { data: profiles, error: profilesError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    if (!profiles || profiles.length < 2) {
      console.error('❌ Need at least 2 users to test notifications');
      return;
    }

    console.log(`✅ Found ${profiles.length} users`);
    profiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.first_name} ${profile.last_name} (${profile.email})`);
    });

    // Step 2: Check follower relationships
    console.log('\n2️⃣ Checking follower relationships...');
    const { data: follows, error: followsError } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        following_id,
        verified_profiles!user_follows_follower_id_fkey (first_name, last_name),
        verified_profiles!user_follows_following_id_fkey (first_name, last_name)
      `);

    if (followsError) {
      console.error('❌ Error fetching follows:', followsError);
      return;
    }

    if (!follows || follows.length === 0) {
      console.log('⚠️  No follower relationships found. Creating test relationships...');
      
      // Create test follow relationships
      const streamer = profiles[0];
      const follower = profiles[1];
      
      const { error: insertError } = await supabase
        .from('user_follows')
        .insert({
          follower_id: follower.id,
          following_id: streamer.id
        });

      if (insertError) {
        console.error('❌ Error creating test follow relationship:', insertError);
        return;
      }

      console.log(`✅ Created test follow: ${follower.first_name} follows ${streamer.first_name}`);
    } else {
      console.log(`✅ Found ${follows.length} follower relationships`);
      follows.forEach((follow, index) => {
        const follower = follow.verified_profiles;
        const following = follow.verified_profiles;
        console.log(`   ${index + 1}. ${follower?.first_name} follows ${following?.first_name}`);
      });
    }

    // Step 3: Test the notification function directly
    console.log('\n3️⃣ Testing notification function...');
    
    const testStreamer = profiles[0];
    const testStream = {
      streamer_id: testStreamer.id,
      stream_id: 'test-stream-' + Date.now(),
      stream_title: 'Test Livestream - ' + new Date().toLocaleTimeString(),
      stream_description: 'This is a test livestream to verify email notifications are working correctly.',
      stream_url: 'https://biblenow.io/live-stream?room=test-room&title=Test+Stream'
    };

    console.log('📧 Sending test notification...');
    console.log(`   Streamer: ${testStreamer.first_name} ${testStreamer.last_name}`);
    console.log(`   Stream: ${testStream.stream_title}`);
    console.log(`   URL: ${testStream.stream_url}`);

    // Call the notification function
    const { data: notificationResult, error: notificationError } = await supabase.functions.invoke(
      'send-livestream-notification',
      {
        body: testStream
      }
    );

    if (notificationError) {
      console.error('❌ Error calling notification function:', notificationError);
      return;
    }

    console.log('✅ Notification function called successfully!');
    console.log('📊 Results:', JSON.stringify(notificationResult, null, 2));

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
        console.log(`   ${index + 1}. ${notification.title} - ${new Date(notification.created_at).toLocaleString()}`);
        console.log(`      Body: ${notification.body}`);
      });
    } else {
      console.log('⚠️  No email notifications found in logs');
    }

    // Step 5: Test email preferences
    console.log('\n5️⃣ Testing email preferences...');
    const { data: preferences, error: prefsError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email_preferences')
      .not('email_preferences', 'is', null);

    if (prefsError) {
      console.error('❌ Error fetching email preferences:', prefsError);
      return;
    }

    if (preferences && preferences.length > 0) {
      console.log(`✅ Found ${preferences.length} users with email preferences:`);
      preferences.forEach((user, index) => {
        const prefs = user.email_preferences || {};
        console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
        console.log(`      Livestream notifications: ${prefs.livestreamNotifications !== false ? '✅ Enabled' : '❌ Disabled'}`);
        console.log(`      Streaming limit emails: ${prefs.streamingLimitEmails !== false ? '✅ Enabled' : '❌ Disabled'}`);
      });
    } else {
      console.log('⚠️  No users with email preferences found');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User profiles loaded');
    console.log('   ✅ Follower relationships checked/created');
    console.log('   ✅ Notification function tested');
    console.log('   ✅ Notification logs reviewed');
    console.log('   ✅ Email preferences checked');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testLivestreamNotifications();
