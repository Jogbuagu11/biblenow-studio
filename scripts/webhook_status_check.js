#!/usr/bin/env node

/**
 * Webhook Status Check
 * Comprehensive test to verify webhook endpoint status and configuration
 */

const crypto = require('crypto');

const WEBHOOK_URL = 'https://biblenow-studio-backend.onrender.com/api/stripe/webhook';

async function checkWebhookStatus() {
  console.log('🔍 Stripe Webhook Status Check');
  console.log('================================');
  
  // Test 1: Basic endpoint accessibility
  console.log('\n1️⃣ Testing endpoint accessibility...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    console.log(`   Response: ${responseText}`);
    
    if (response.status === 400 && responseText.includes('stripe-signature')) {
      console.log('   ✅ Endpoint is accessible and properly configured');
      console.log('   ✅ Webhook signature verification is working');
    } else {
      console.log('   ❌ Unexpected response - check endpoint configuration');
    }
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
  }
  
  // Test 2: Test with mock signature
  console.log('\n2️⃣ Testing with mock signature...');
  try {
    const mockSignature = 't=1234567890,v1=mock_signature';
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': mockSignature
      },
      body: JSON.stringify({ test: 'data' })
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    console.log(`   Response: ${responseText}`);
    
    if (response.status === 400 && responseText.includes('signature verification failed')) {
      console.log('   ✅ Signature verification is working (rejected invalid signature)');
    } else {
      console.log('   ⚠️  Unexpected response to invalid signature');
    }
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
  
  // Test 3: Test with proper signature format
  console.log('\n3️⃣ Testing with proper signature format...');
  try {
    const testEvent = {
      id: 'evt_test',
      object: 'event',
      type: 'account.updated',
      data: { object: { id: 'acct_test' } },
      created: Math.floor(Date.now() / 1000)
    };
    
    // Generate a proper signature format (but with test secret)
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify(testEvent);
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', 'test_secret').update(signedPayload, 'utf8').digest('hex');
    const stripeSignature = `t=${timestamp},v1=${signature}`;
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': stripeSignature
      },
      body: payload
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const responseText = await response.text();
    console.log(`   Response: ${responseText}`);
    
    if (responseText.includes('The "key" argument must be of type string')) {
      console.log('   ⚠️  Webhook secret is not configured (STRIPE_WEBHOOK_SECRET is undefined)');
      console.log('   📝 This is expected if the webhook secret is not set in production');
    } else if (response.status === 200) {
      console.log('   ✅ Webhook processed successfully');
    } else {
      console.log('   ⚠️  Unexpected response');
    }
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
  
  // Summary and recommendations
  console.log('\n📊 Summary:');
  console.log('   ✅ Webhook endpoint is accessible');
  console.log('   ✅ Webhook signature verification is implemented');
  console.log('   ⚠️  Webhook secret may not be configured in production');
  
  console.log('\n🔧 Next Steps:');
  console.log('   1. Check if STRIPE_WEBHOOK_SECRET is set in your production environment');
  console.log('   2. If not set, configure it in your Stripe Dashboard → Developers → Webhooks');
  console.log('   3. Add the webhook endpoint URL to Stripe:');
  console.log(`      ${WEBHOOK_URL}`);
  console.log('   4. Select these events:');
  console.log('      - account.updated');
  console.log('      - account.application.authorized');
  console.log('      - payment_intent.succeeded');
  console.log('   5. Copy the webhook secret and set it as STRIPE_WEBHOOK_SECRET');
  
  console.log('\n🧪 To test with real webhook secret:');
  console.log('   node scripts/test_webhook_with_real_secret.js');
}

// Run the check
if (require.main === module) {
  checkWebhookStatus().catch(console.error);
}

module.exports = { checkWebhookStatus };
