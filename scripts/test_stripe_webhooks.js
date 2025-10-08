#!/usr/bin/env node

/**
 * Stripe Webhook Testing Script
 * Tests the webhook endpoint to ensure it's working properly
 */

const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = 'https://biblenow-studio-backend.onrender.com/api/stripe/webhook';
const TEST_WEBHOOK_SECRET = 'whsec_test_secret_for_testing'; // This should match your actual webhook secret

// Test webhook events
const testEvents = {
  accountUpdated: {
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
  },
  
  accountApplicationAuthorized: {
    id: 'evt_test_webhook_2',
    object: 'event',
    type: 'account.application.authorized',
    data: {
      object: {
        id: 'acct_test_account_2',
        object: 'account',
        type: 'express',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true
      }
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false
  },
  
  paymentIntentSucceeded: {
    id: 'evt_test_webhook_3',
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_payment_intent',
        object: 'payment_intent',
        amount: 2000,
        currency: 'usd',
        status: 'succeeded',
        metadata: {
          user_id: 'test_user_123'
        }
      }
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false
  }
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
 * Test webhook endpoint with a specific event
 */
async function testWebhookEvent(eventName, event) {
  console.log(`\n🧪 Testing ${eventName}...`);
  
  try {
    const payload = JSON.stringify(event);
    const signature = generateStripeSignature(event, TEST_WEBHOOK_SECRET);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature
      },
      body: payload
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log(`   ✅ ${eventName} webhook test PASSED`);
      const responseText = await response.text();
      if (responseText) {
        console.log(`   Response: ${responseText}`);
      }
    } else {
      console.log(`   ❌ ${eventName} webhook test FAILED`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
    }
    
    return response.ok;
  } catch (error) {
    console.log(`   ❌ ${eventName} webhook test ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test webhook endpoint without signature (should fail)
 */
async function testWebhookWithoutSignature() {
  console.log(`\n🧪 Testing webhook without signature (should fail)...`);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEvents.accountUpdated)
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 400) {
      console.log(`   ✅ Webhook signature verification is working (correctly rejected unsigned request)`);
      return true;
    } else {
      console.log(`   ❌ Webhook signature verification may not be working (unexpected response)`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Webhook test ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Test webhook endpoint with invalid signature (should fail)
 */
async function testWebhookWithInvalidSignature() {
  console.log(`\n🧪 Testing webhook with invalid signature (should fail)...`);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 't=1234567890,v1=invalid_signature'
      },
      body: JSON.stringify(testEvents.accountUpdated)
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 400) {
      console.log(`   ✅ Webhook signature verification is working (correctly rejected invalid signature)`);
      return true;
    } else {
      console.log(`   ❌ Webhook signature verification may not be working (unexpected response)`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Webhook test ERROR: ${error.message}`);
    return false;
  }
}

/**
 * Main test function
 */
async function runWebhookTests() {
  console.log('🚀 Starting Stripe Webhook Tests');
  console.log(`📍 Testing endpoint: ${WEBHOOK_URL}`);
  console.log(`🔑 Using test webhook secret: ${TEST_WEBHOOK_SECRET}`);
  
  const results = {
    connectivity: false,
    signatureVerification: false,
    accountUpdated: false,
    accountApplicationAuthorized: false,
    paymentIntentSucceeded: false
  };
  
  // Test 1: Basic connectivity
  console.log('\n🧪 Testing basic connectivity...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'GET'
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    results.connectivity = response.status !== 404;
  } catch (error) {
    console.log(`   ❌ Connectivity test failed: ${error.message}`);
  }
  
  // Test 2: Test without signature (should fail)
  results.signatureVerification = await testWebhookWithoutSignature();
  
  // Test 3: Test with invalid signature (should fail)
  const invalidSignatureTest = await testWebhookWithInvalidSignature();
  results.signatureVerification = results.signatureVerification && invalidSignatureTest;
  
  // Test 4: Test valid webhook events
  results.accountUpdated = await testWebhookEvent('account.updated', testEvents.accountUpdated);
  results.accountApplicationAuthorized = await testWebhookEvent('account.application.authorized', testEvents.accountApplicationAuthorized);
  results.paymentIntentSucceeded = await testWebhookEvent('payment_intent.succeeded', testEvents.paymentIntentSucceeded);
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   Connectivity: ${results.connectivity ? '✅' : '❌'}`);
  console.log(`   Signature Verification: ${results.signatureVerification ? '✅' : '❌'}`);
  console.log(`   account.updated: ${results.accountUpdated ? '✅' : '❌'}`);
  console.log(`   account.application.authorized: ${results.accountApplicationAuthorized ? '✅' : '❌'}`);
  console.log(`   payment_intent.succeeded: ${results.paymentIntentSucceeded ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (!allPassed) {
    console.log('\n🔧 Troubleshooting Tips:');
    if (!results.connectivity) {
      console.log('   - Check if the server is running');
      console.log('   - Verify the webhook URL is correct');
    }
    if (!results.signatureVerification) {
      console.log('   - Check if STRIPE_WEBHOOK_SECRET is set correctly');
      console.log('   - Verify webhook signature verification is implemented');
    }
    if (!results.accountUpdated || !results.accountApplicationAuthorized || !results.paymentIntentSucceeded) {
      console.log('   - Check webhook event handling logic');
      console.log('   - Verify database connection');
      console.log('   - Check server logs for errors');
    }
  }
  
  return results;
}

// Run the tests
if (require.main === module) {
  runWebhookTests().catch(console.error);
}

module.exports = { runWebhookTests, testWebhookEvent, generateStripeSignature };
