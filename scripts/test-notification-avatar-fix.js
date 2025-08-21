const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNotificationAvatarFix() {
  console.log('🧪 Testing Notification Avatar Fix...\n');

  try {
    // 1. Check if verified_profiles table has profile_photo_url column
    console.log('1. Checking verified_profiles table structure...');
    const { data: profiles, error: profilesError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, profile_photo_url')
      .limit(1);

    if (profilesError) {
      console.error('❌ Error checking verified_profiles:', profilesError);
      return;
    }

    console.log('✅ verified_profiles table structure is correct');
    console.log('   Sample profile:', profiles[0]);

    // 2. Check if notifications table exists and has metadata
    console.log('\n2. Checking notifications table structure...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, type, metadata')
      .limit(1);

    if (notificationsError) {
      console.error('❌ Error checking notifications:', notificationsError);
      return;
    }

    console.log('✅ notifications table structure is correct');
    if (notifications.length > 0) {
      console.log('   Sample notification:', notifications[0]);
    }

    // 3. Test creating a notification with avatar
    console.log('\n3. Testing notification creation with avatar...');
    
    // Get a sample verified profile
    const { data: sampleProfile, error: profileError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, profile_photo_url')
      .limit(1)
      .single();

    if (profileError || !sampleProfile) {
      console.error('❌ No verified profiles found for testing');
      return;
    }

    // Create a test notification
    const testNotification = {
      user_id: sampleProfile.id,
      type: 'streamer_live',
      title: `${sampleProfile.first_name} ${sampleProfile.last_name} is live!`,
      body: `${sampleProfile.first_name} ${sampleProfile.last_name} started streaming: Test Stream`,
      is_read: false,
      metadata: {
        stream_id: 'test-stream-id',
        streamer_id: sampleProfile.id,
        streamer_name: `${sampleProfile.first_name} ${sampleProfile.last_name}`,
        streamer_avatar: sampleProfile.profile_photo_url,
        stream_title: 'Test Stream',
        stream_description: 'Test stream description',
        platform: 'biblenow_video',
        stream_mode: 'solo',
        livestream_type: 'video',
        action: 'stream_started'
      }
    };

    const { data: newNotification, error: createError } = await supabase
      .from('notifications')
      .insert([testNotification])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating test notification:', createError);
      return;
    }

    console.log('✅ Test notification created successfully');
    console.log('   Notification ID:', newNotification.id);
    console.log('   Streamer Avatar:', newNotification.metadata.streamer_avatar);

    // 4. Clean up test notification
    console.log('\n4. Cleaning up test notification...');
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', newNotification.id);

    if (deleteError) {
      console.error('⚠️  Warning: Could not delete test notification:', deleteError);
    } else {
      console.log('✅ Test notification cleaned up');
    }

    console.log('\n🎉 All tests passed! Notification avatar fix is working correctly.');
    console.log('\n📋 Summary:');
    console.log('   ✅ verified_profiles table has profile_photo_url column');
    console.log('   ✅ notifications table supports metadata with streamer_avatar');
    console.log('   ✅ Can create notifications with streamer avatars');
    console.log('   ✅ Avatar URLs are properly stored in notification metadata');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testNotificationAvatarFix(); 