const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect existing Stripe account
app.post('/api/stripe/connect-existing-account', async (req, res) => {
  try {
    const { accountId, userId } = req.body;

    if (!accountId || !userId) {
      return res.status(400).json({ error: 'Account ID and User ID are required' });
    }

    // Verify the account exists and is accessible
    const account = await stripe.accounts.retrieve(accountId);
    
    if (!account) {
      return res.status(404).json({ error: 'Stripe account not found' });
    }

    // Check if account is already connected to another user
    const { data: existingConnection } = await supabase
      .from('verified_profiles')
      .select('user_id')
      .eq('stripe_account_id', accountId)
      .neq('user_id', userId)
      .single();

    if (existingConnection) {
      return res.status(409).json({ error: 'This Stripe account is already connected to another user' });
    }

    // Store the account ID in the database
    const { error } = await supabase
      .from('verified_profiles')
      .update({ stripe_account_id: accountId })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating database:', error);
      return res.status(500).json({ error: 'Failed to connect account to database' });
    }

    // Return account details
    res.json({
      id: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      businessProfile: {
        name: account.business_profile?.name,
        url: account.business_profile?.url,
        supportEmail: account.business_profile?.support_email,
      },
    });
  } catch (error) {
    console.error('Error connecting existing account:', error);
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid Stripe account ID' });
    }
    res.status(500).json({ error: 'Failed to connect account' });
  }
});

// Get Stripe account status
app.get('/api/stripe/account-status', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user's Stripe account ID from database
    const { data: profile, error } = await supabase
      .from('verified_profiles')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();

    if (error || !profile?.stripe_account_id) {
      return res.status(404).json({ error: 'No Stripe account found' });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    res.json({
      id: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      businessProfile: {
        name: account.business_profile?.name,
        url: account.business_profile?.url,
        supportEmail: account.business_profile?.support_email,
      },
    });
  } catch (error) {
    console.error('Error getting account status:', error);
    res.status(500).json({ error: 'Failed to get account status' });
  }
});

// Verify account ownership (for security)
app.post('/api/stripe/verify-account-ownership', async (req, res) => {
  try {
    const { accountId, userId } = req.body;

    if (!accountId || !userId) {
      return res.status(400).json({ error: 'Account ID and User ID are required' });
    }

    // Check if the account is connected to this user
    const { data: profile, error } = await supabase
      .from('verified_profiles')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .eq('stripe_account_id', accountId)
      .single();

    if (error || !profile) {
      return res.json({ verified: false });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('Error verifying account ownership:', error);
    res.status(500).json({ error: 'Failed to verify account ownership' });
  }
});

// Create account login link
app.post('/api/stripe/account-login-link', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    const loginLink = await stripe.accounts.createLoginLink(accountId);

    res.json({ url: loginLink.url });
  } catch (error) {
    console.error('Error creating login link:', error);
    res.status(500).json({ error: 'Failed to create login link' });
  }
});

// Create payment intent for donations (using connected account)
app.post('/api/stripe/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', metadata = {}, connectedAccountId } = req.body;

    if (!amount || !connectedAccountId) {
      return res.status(400).json({ error: 'Amount and connected account ID are required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      application_fee_amount: Math.round(amount * 0.1), // 10% platform fee
    }, {
      stripeAccount: connectedAccountId, // Use the connected account
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Handle Stripe webhooks
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object;
        console.log('Account updated:', account.id);
        // Update account status in database if needed
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // Handle successful payment
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

// Disconnect Stripe account
app.post('/api/stripe/disconnect-account', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Remove the account ID from the database
    const { error } = await supabase
      .from('verified_profiles')
      .update({ stripe_account_id: null })
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting account:', error);
      return res.status(500).json({ error: 'Failed to disconnect account' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 