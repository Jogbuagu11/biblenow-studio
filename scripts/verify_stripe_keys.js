const stripe = require('stripe');

// Test Stripe keys
async function verifyStripeKeys() {
  console.log('🔑 Verifying Stripe Keys...\n');

  // Test keys (replace with your actual keys)
  const testKeys = [
    'sk_test_...', // Replace with your test secret key
    'sk_live_...', // Replace with your live secret key
  ];

  for (const key of testKeys) {
    if (key === 'sk_test_...' || key === 'sk_live_...') {
      console.log('⚠️  Please replace the placeholder keys with your actual Stripe keys');
      continue;
    }

    console.log(`Testing key: ${key.substring(0, 10)}...`);
    
    try {
      const stripeInstance = stripe(key);
      
      // Test 1: Basic API call
      const account = await stripeInstance.accounts.list({ limit: 1 });
      console.log('   ✅ Key is valid');
      
      // Test 2: Check permissions
      try {
        await stripeInstance.accounts.create({
          type: 'express',
          country: 'US',
          email: 'test@example.com',
        });
        console.log('   ✅ Has Connect permissions');
      } catch (permError) {
        if (permError.code === 'account_invalid') {
          console.log('   ✅ Has Connect permissions (account creation blocked by business logic)');
        } else {
          console.log('   ❌ Missing Connect permissions:', permError.message);
        }
      }
      
    } catch (error) {
      console.log('   ❌ Key is invalid:', error.message);
      if (error.type === 'StripeAuthenticationError') {
        console.log('   💡 This means the key is either invalid or has wrong permissions');
      }
    }
    console.log('');
  }

  console.log('📋 Key Verification Summary:');
  console.log('- Use sk_test_ keys for development/testing');
  console.log('- Use sk_live_ keys for production');
  console.log('- Keys must have Connect permissions enabled');
  console.log('- Get your keys from: https://dashboard.stripe.com/apikeys');
}

verifyStripeKeys().catch(console.error); 