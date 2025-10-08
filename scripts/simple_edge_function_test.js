// Simple test of the edge function
// Copy and paste this into your browser console

console.log('🧪 Simple edge function test...');

async function testEdgeFunction() {
  try {
    console.log('1️⃣ Testing edge function with minimal data...');
    
    const { data, error } = await supabase.functions.invoke('send-streaming-limit-email', {
      body: {
        user_id: 'test-user-id',
        email: 'test@example.com',
        first_name: 'Test User',
        type: 'warning',
        usage_percentage: 75,
        remaining_minutes: 300,
        reset_date: '2025-10-15'
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      console.log('🔍 Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText
      });
      
      // Show specific fixes for common errors
      if (error.message?.includes('401') || error.status === 401) {
        console.log('💡 FIX: Authentication error - check your Supabase auth token');
      } else if (error.message?.includes('404') || error.status === 404) {
        console.log('💡 FIX: Function not found - check function deployment');
      } else if (error.message?.includes('500') || error.status === 500) {
        console.log('💡 FIX: Server error - check edge function logs');
      }
    } else {
      console.log('✅ Edge function success:', data);
    }
  } catch (err) {
    console.error('❌ Test error:', err);
  }
}

testEdgeFunction();
