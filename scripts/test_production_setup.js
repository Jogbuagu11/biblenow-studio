const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test production setup
async function testProductionSetup() {
  console.log('🔍 Testing Production Setup...\n');

  // Test 1: Environment Variables
  console.log('1. Checking Environment Variables:');
  console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
  console.log('   STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
  console.log('   FRONTEND_URL:', process.env.FRONTEND_URL ? '✅ Set' : '❌ Missing');
  console.log('');

  // Test 2: Supabase Connection
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('2. Testing Supabase Connection:');
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data, error } = await supabase
        .from('verified_profiles')
        .select('id, email, stripe_account_id')
        .limit(5);

      if (error) {
        console.log('   ❌ Database connection failed:', error.message);
      } else {
        console.log('   ✅ Database connection successful');
        console.log('   📊 Found', data?.length || 0, 'users in verified_profiles');
        if (data && data.length > 0) {
          console.log('   👥 Sample users:');
          data.forEach(user => {
            console.log(`      - ${user.email} (${user.id}) - Stripe: ${user.stripe_account_id || 'Not connected'}`);
          });
        }
      }
    } catch (error) {
      console.log('   ❌ Database connection error:', error.message);
    }
    console.log('');
  }

  // Test 3: Stripe Connection
  if (process.env.STRIPE_SECRET_KEY) {
    console.log('3. Testing Stripe Connection:');
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const account = await stripe.accounts.list({ limit: 1 });
      console.log('   ✅ Stripe connection successful');
      console.log('   📊 Found', account.data.length, 'Stripe accounts');
    } catch (error) {
      console.log('   ❌ Stripe connection failed:', error.message);
      if (error.type === 'StripeAuthenticationError') {
        console.log('   💡 This usually means your Stripe API key is invalid or has wrong permissions');
      }
    }
    console.log('');
  }

  // Test 4: API Endpoint Test
  console.log('4. Testing API Endpoints:');
  const apiUrl = process.env.FRONTEND_URL?.replace('https://studio.biblenow.io', 'https://biblenow-studio-backend.onrender.com/api') || 'https://biblenow-studio-backend.onrender.com/api';
  
  try {
    const response = await fetch(`${apiUrl}/health`);
    if (response.ok) {
      console.log('   ✅ Backend API is responding');
    } else {
      console.log('   ❌ Backend API error:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Backend API connection failed:', error.message);
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Fix any missing environment variables above');
  console.log('2. Redeploy your backend after setting environment variables');
  console.log('3. Test the Stripe Connect flow again');
  console.log('4. Check the browser console for any remaining errors');
}

// Run the test
testProductionSetup().catch(console.error); 