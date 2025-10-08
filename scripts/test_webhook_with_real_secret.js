#!/usr/bin/env node

/**
 * Test webhook with actual webhook secret
 * This script tests the webhook endpoint using the real webhook secret
 */

const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = 'https://biblenow-studio-backend.onrender.com/api/stripe/webhook';

// You need to replace this with your actual webhook secret from Stripe Dashboard
const ACTUAL_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET_STUDIO || 'whsec_your_actual_webhook_secret_here';

// Test webhook event
const testEvent = {
  id: 'evt_test_webhook',
  object: 'event',
  type: 'account.updated',
  data: {
    object: {
      id: 'acct_test_account',
      object: 'account',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      business_type: 'individual',
      country: 'US',
      business_profile: {
        name: 'Test Business',
        url: 'https://test.com'
      }
    }
  },
  created: Math.floor(Date.now() / 1000),
  livemode: false
};

/**
 * Generate Stripe webhook signature
 */
function generateStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Test webhook endpoint
 */
async function testWebhook() {
  console.log('🧪 Testing Stripe Webhook with Real Secret');
  console.log(`📍 Endpoint: ${WEBHOOK_URL}`);
  console.log(`🔑 Using secret: ${ACTUAL_WEBHOOK_SECRET.substring(0, 10)}...`);
  
  if (ACTUAL_WEBHOOK_SECRET === 'whsec_your_actual_webhook_secret_here') {
    console.log('❌ Please set your actual webhook secret in the script or as STRIPE_WEBHOOK_SECRET_STUDIO environment variable');
    console.log('   You can get this from your Stripe Dashboard → Developers → Webhooks');
    return;
  }
  
  try {
    const payload = JSON.stringify(testEvent);
    const signature = generateStripeSignature(testEvent, ACTUAL_WEBHOOK_SECRET);
    
    console.log('\n📤 Sending webhook request...');
    console.log(`   Event type: ${testEvent.type}`);
    console.log(`   Account ID: ${testEvent.data.object.id}`);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature
      },
      body: payload
    });
    
    console.log(`\n📥 Response received:`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    if (responseText) {
      console.log(`   Response body: ${responseText}`);
    }
    
    if (response.ok) {
      console.log('\n✅ Webhook test PASSED!');
      console.log('   The webhook endpoint is working correctly');
    } else {
      console.log('\n❌ Webhook test FAILED');
      console.log('   Check the server logs for more details');
    }
    
  } catch (error) {
    console.log(`\n❌ Webhook test ERROR: ${error.message}`);
  }
}

// Run the test
if (require.main === module) {
  testWebhook().catch(console.error);
}

module.exports = { testWebhook, generateStripeSignature };
