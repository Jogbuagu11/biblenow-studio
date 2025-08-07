const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Testing Authentication and Chat Access...\n');

async function testAuthAndChat() {
  try {
    // 1. Test basic Supabase connection
    console.log('1️⃣ Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('verified_profiles')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ Supabase connection failed:', connectionError.message);
    } else {
      console.log('✅ Supabase connection successful');
    }

    // 2. Test chat table access
    console.log('\n2️⃣ Testing chat table access...');
    const { data: chatTest, error: chatError } = await supabase
      .from('livestream_chat')
      .select('count')
      .limit(1);
    
    if (chatError) {
      console.log('❌ Chat table access failed:', chatError.message);
    } else {
      console.log('✅ Chat table access successful');
    }

    // 3. Test RLS policies
    console.log('\n3️⃣ Testing RLS policies...');
    
    // Test unauthenticated access (should fail)
    const { data: unauthenticatedData, error: unauthenticatedError } = await supabase
      .from('livestream_chat')
      .select('*')
      .limit(1);
    
    if (unauthenticatedError) {
      console.log('✅ Unauthenticated access properly blocked:', unauthenticatedError.message);
    } else {
      console.log('❌ Unauthenticated access should be blocked but succeeded');
    }

    // 4. Test with a test user (if available)
    console.log('\n4️⃣ Testing with test user...');
    
    // Try to sign in with a test user
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

    // 5. Test sending a message
    console.log('\n5️⃣ Testing message sending...');
    
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

    console.log('\n🎉 Authentication and chat test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAuthAndChat(); 