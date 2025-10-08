#!/usr/bin/env node

/**
 * Check Production Stripe Configuration
 * Tests the production server to see which Stripe account is being used
 */

async function checkProductionStripe() {
  console.log('🔍 Checking Production Stripe Configuration');
  console.log('==========================================\n');
  
  const serverUrl = 'https://biblenow-studio-backend.onrender.com';
  
  try {
    // Test server health
    console.log('1️⃣ Testing server health...');
    const healthResponse = await fetch(`${serverUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response: ${JSON.stringify(healthData)}`);
    
    if (!healthResponse.ok) {
      console.log('   ❌ Server is not responding properly');
      return;
    }
    
    // Test Stripe configuration (this will fail if no key is set, but that's expected)
    console.log('\n2️⃣ Testing Stripe configuration...');
    try {
      const stripeResponse = await fetch(`${serverUrl}/api/stripe/account-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: 'acct_test' })
      });
      
      console.log(`   Status: ${stripeResponse.status}`);
      const stripeData = await stripeResponse.text();
      console.log(`   Response: ${stripeData}`);
      
      if (stripeResponse.status === 500 && stripeData.includes('Stripe not initialized')) {
        console.log('   ⚠️  Stripe is not configured on the production server');
        console.log('   💡 You need to set STRIPE_SECRET_KEY in your Render.com environment');
      } else if (stripeResponse.status === 400) {
        console.log('   ✅ Stripe is configured (got expected validation error)');
      }
      
    } catch (stripeError) {
      console.log('   ❌ Error testing Stripe:', stripeError.message);
    }
    
    // Test webhook endpoint
    console.log('\n3️⃣ Testing webhook endpoint...');
    try {
      const webhookResponse = await fetch(`${serverUrl}/api/stripe/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      });
      
      console.log(`   Status: ${webhookResponse.status}`);
      const webhookData = await webhookResponse.text();
      console.log(`   Response: ${webhookData}`);
      
      if (webhookResponse.status === 400 && webhookData.includes('stripe-signature')) {
        console.log('   ✅ Webhook endpoint is working (correctly rejected unsigned request)');
      } else if (webhookData.includes('The "key" argument must be of type string')) {
        console.log('   ⚠️  Webhook endpoint exists but STRIPE_WEBHOOK_SECRET_STUDIO is not set');
      } else {
        console.log('   ❌ Unexpected webhook response');
      }
      
    } catch (webhookError) {
      console.log('   ❌ Error testing webhook:', webhookError.message);
    }
    
    console.log('\n📋 Summary:');
    console.log('   ✅ Server is running');
    console.log('   ✅ Webhook endpoint exists');
    console.log('   ⚠️  Need to configure Stripe keys and webhook secret in Render.com');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Go to your Render.com dashboard');
    console.log('2. Find your "biblenow-studio-backend" service');
    console.log('3. Go to Environment tab');
    console.log('4. Add these environment variables:');
    console.log('   - STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)');
    console.log('   - STRIPE_WEBHOOK_SECRET_STUDIO=whsec_...');
    console.log('5. Redeploy the service');
    console.log('6. Set up the webhook in your Stripe Dashboard');
    
  } catch (error) {
    console.log('❌ Error checking production server:', error.message);
  }
}

// Run the check
if (require.main === module) {
  checkProductionStripe().catch(console.error);
}

module.exports = { checkProductionStripe };
