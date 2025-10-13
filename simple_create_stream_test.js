// Simple test for create-stream function
// Copy and paste this into your browser console on the BibleNOW Studio app

console.log('🧪 Simple Create-Stream Function Test');
console.log('=====================================');

// Test function
async function testCreateStream() {
  try {
    console.log('1️⃣ Getting current user...');
    const { data: { user }, error: authError } = await window.supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ No user found. Please log in first.');
      return;
    }
    
    console.log('✅ User found:', user.email);
    
    console.log('2️⃣ Calling create-stream function...');
    const testData = {
      title: 'Test Stream - ' + new Date().toLocaleTimeString(),
      description: 'Testing create-stream function logs',
      platform: 'biblenow_video',
      stream_type: 'video',
      stream_mode: 'solo',
      room_name: 'test-' + Date.now()
    };
    
    console.log('📺 Stream data:', testData);
    
    const { data: result, error: functionError } = await window.supabase.functions.invoke(
      'create-stream',
      { 
        body: {
          userId: user.id,
          streamData: testData
        }
      }
    );
    
    if (functionError) {
      console.error('❌ Function error:', functionError);
    } else {
      console.log('✅ Function success:', result);
    }
    
    console.log('3️⃣ Checking recent streams...');
    const { data: streams, error: streamsError } = await window.supabase
      .from('livestreams')
      .select('*')
      .eq('streamer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (streamsError) {
      console.error('❌ Streams error:', streamsError);
    } else {
      console.log('✅ Recent stream:', streams?.[0]);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

console.log('🚀 Run: testCreateStream()');
console.log('📋 This will test the create-stream function and show results');
console.log('🔍 Check Supabase Dashboard > Functions > create-stream > Logs for function logs');
