#!/usr/bin/env node

/**
 * Check Stripe Account Configuration
 * Helps identify which Stripe account is being used and set up webhooks
 */

const stripe = require('stripe');

async function checkStripeAccount() {
  console.log('🔍 Checking Stripe Account Configuration');
  console.log('=====================================\n');
  
  // Check if Stripe key is configured
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeKey) {
    console.log('❌ STRIPE_SECRET_KEY is not set');
    console.log('   Please set your Stripe secret key in your environment');
    console.log('   Get it from: https://dashboard.stripe.com/apikeys');
    return;
  }
  
  console.log(`🔑 Using Stripe key: ${stripeKey.substring(0, 10)}...`);
  console.log(`📊 Key type: ${stripeKey.startsWith('sk_test_') ? 'TEST' : 'LIVE'}`);
  
  try {
    const stripeInstance = stripe(stripeKey);
    
    // Get account information
    console.log('\n📋 Account Information:');
    const account = await stripeInstance.accounts.retrieve();
    
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Account Type: ${account.type}`);
    console.log(`   Country: ${account.country}`);
    console.log(`   Business Type: ${account.business_type || 'Not set'}`);
    console.log(`   Email: ${account.email || 'Not set'}`);
    
    if (account.business_profile) {
      console.log(`   Business Name: ${account.business_profile.name || 'Not set'}`);
      console.log(`   Business URL: ${account.business_profile.url || 'Not set'}`);
    }
    
    // Check webhook endpoints
    console.log('\n🔗 Current Webhook Endpoints:');
    try {
      const webhooks = await stripeInstance.webhookEndpoints.list({ limit: 10 });
      
      if (webhooks.data.length === 0) {
        console.log('   ❌ No webhook endpoints found');
        console.log('   💡 You need to create a webhook endpoint');
      } else {
        console.log(`   Found ${webhooks.data.length} webhook endpoint(s):`);
        webhooks.data.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ${webhook.url}`);
          console.log(`      Status: ${webhook.status}`);
          console.log(`      Events: ${webhook.enabled_events.length} events`);
          console.log(`      Created: ${new Date(webhook.created * 1000).toLocaleDateString()}`);
          console.log('');
        });
      }
    } catch (webhookError) {
      console.log('   ❌ Error fetching webhooks:', webhookError.message);
    }
    
    // Check if the expected webhook exists
    console.log('\n🎯 Looking for BibleNOW Studio webhook...');
    try {
      const webhooks = await stripeInstance.webhookEndpoints.list({ limit: 20 });
      const studioWebhook = webhooks.data.find(webhook => 
        webhook.url.includes('biblenow-studio-backend.onrender.com') ||
        webhook.url.includes('studio.biblenow.io')
      );
      
      if (studioWebhook) {
        console.log('   ✅ Found BibleNOW Studio webhook:');
        console.log(`      URL: ${studioWebhook.url}`);
        console.log(`      Status: ${studioWebhook.status}`);
        console.log(`      Events: ${webhook.enabled_events.join(', ')}`);
        console.log(`      Secret: ${studioWebhook.secret ? 'Set' : 'Not set'}`);
      } else {
        console.log('   ❌ BibleNOW Studio webhook not found');
        console.log('   💡 You need to create a webhook endpoint');
      }
    } catch (error) {
      console.log('   ❌ Error checking for studio webhook:', error.message);
    }
    
    // Instructions for setting up webhook
    console.log('\n🚀 Next Steps:');
    console.log('1. Go to your Stripe Dashboard:');
    console.log(`   https://dashboard.stripe.com/${stripeKey.startsWith('sk_test_') ? 'test' : ''}webhooks`);
    console.log('2. Click "Add endpoint"');
    console.log('3. Set endpoint URL to:');
    console.log('   https://biblenow-studio-backend.onrender.com/api/stripe/webhook');
    console.log('4. Select these events:');
    console.log('   - account.updated');
    console.log('   - account.application.authorized');
    console.log('   - payment_intent.succeeded');
    console.log('5. Copy the webhook secret and set it as STRIPE_WEBHOOK_SECRET_STUDIO');
    
  } catch (error) {
    console.log('❌ Error connecting to Stripe:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('💡 This usually means:');
      console.log('   - Your API key is invalid');
      console.log('   - You\'re using the wrong Stripe account');
      console.log('   - Your API key doesn\'t have the right permissions');
    }
  }
}

// Run the check
if (require.main === module) {
  checkStripeAccount().catch(console.error);
}

module.exports = { checkStripeAccount };
