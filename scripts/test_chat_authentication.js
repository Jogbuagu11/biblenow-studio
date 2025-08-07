const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 Testing Chat Authentication End-to-End...\n');

async function testChatAuthentication() {
  try {
    // 1. Test unauthenticated access (should fail)
    console.log('1️⃣ Testing unauthenticated access...');
    const { data: unauthenticatedData, error: unauthenticatedError } = await supabase
      .from('livestream_chat')
      .select('*')
      .limit(1);
    
    if (unauthenticatedError) {
      console.log('✅ Unauthenticated access properly blocked:', unauthenticatedError.message);
    } else {
      console.log('❌ Unauthenticated access should be blocked but succeeded');
    }

    // 2. Test authenticated access (should work)
    console.log('\n2️⃣ Testing authenticated access...');
    
    // First, try to sign in with a test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@biblenowstudio.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.log('⚠️  Test user not found, trying to create one...');
      
      // Try to sign up a test user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@biblenowstudio.com',
        password: 'testpassword123',
        options: {
          data: {
            display_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        }
      });

      if (signUpError) {
        console.log('❌ Could not create test user:', signUpError.message);
        console.log('💡 Please create a test user manually or use an existing user');
        return;
      }
    }

    // Now test authenticated access
    const { data: authenticatedData, error: authenticatedError } = await supabase
      .from('livestream_chat')
      .select('*')
      .limit(1);

    if (authenticatedError) {
      console.log('❌ Authenticated access failed:', authenticatedError.message);
    } else {
      console.log('✅ Authenticated access successful');
      console.log('📊 Found', authenticatedData?.length || 0, 'messages');
    }

    // 3. Test sending a message
    console.log('\n3️⃣ Testing message sending...');
    
    const testRoomId = 'test-room-' + Date.now();
    const testMessage = {
      room_id: testRoomId,
      user_id: authData?.user?.id || 'test-user-id',
      user_name: 'Test User',
      user_avatar: 'https://example.com/avatar.jpg',
      text: 'Hello from test script!',
      is_moderator: false
    };

    const { data: insertData, error: insertError } = await supabase
      .from('livestream_chat')
      .insert([testMessage])
      .select();

    if (insertError) {
      console.log('❌ Failed to send message:', insertError.message);
    } else {
      console.log('✅ Message sent successfully');
      console.log('📝 Message ID:', insertData[0]?.id);
    }

    // 4. Test real-time subscription
    console.log('\n4️⃣ Testing real-time subscription...');
    
    const channel = supabase
      .channel('test-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'livestream_chat',
        filter: `room_id=eq.${testRoomId}`
      }, (payload) => {
        console.log('✅ Real-time message received:', payload.new);
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send another message to test real-time
    const realtimeMessage = {
      room_id: testRoomId,
      user_id: authData?.user?.id || 'test-user-id',
      user_name: 'Test User',
      user_avatar: 'https://example.com/avatar.jpg',
      text: 'Real-time test message!',
      is_moderator: false
    };

    const { error: realtimeError } = await supabase
      .from('livestream_chat')
      .insert([realtimeMessage]);

    if (realtimeError) {
      console.log('❌ Failed to send real-time message:', realtimeError.message);
    } else {
      console.log('✅ Real-time message sent');
    }

    // Wait for real-time message to be received
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Clean up subscription
    channel.unsubscribe();

    // 5. Test chat room creation
    console.log('\n5️⃣ Testing chat room creation...');
    
    const { data: roomData, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('room_id', testRoomId)
      .single();

    if (roomError) {
      console.log('❌ Chat room not created automatically:', roomError.message);
    } else {
      console.log('✅ Chat room created automatically');
      console.log('🏠 Room ID:', roomData.room_id);
    }

    // 6. Test user profile integration
    console.log('\n6️⃣ Testing user profile integration...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('verified_profiles')
      .select('first_name, last_name, profile_photo_url')
      .eq('id', authData?.user?.id)
      .single();

    if (profileError) {
      console.log('⚠️  No verified profile found for user');
    } else {
      console.log('✅ User profile found:', profileData);
    }

    console.log('\n🎉 Chat authentication test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testChatAuthentication(); 