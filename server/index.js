const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// Initialize Stripe with debugging
const stripeKey = process.env.STRIPE_SECRET_KEY;
console.log('Initializing Stripe with key type:', stripeKey ? 
  (stripeKey.startsWith('sk_test_') ? 'test' : 'live') : 'none');

let stripe = null;
if (stripeKey && stripeKey !== 'sk_test_your_stripe_secret_key_here') {
  stripe = require('stripe')(stripeKey);
  console.log('✅ Stripe initialized successfully');
} else {
  console.log('⚠️  Stripe not initialized - using placeholder keys for development');
}
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client
console.log('Initializing Supabase client with:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set'
});

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && 
    process.env.SUPABASE_URL !== 'https://your-project.supabase.co' &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your_supabase_service_role_key_here') {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('✅ Supabase initialized successfully');
} else {
  console.log('⚠️  Supabase not initialized - using placeholder keys for development');
}

// Middleware
app.use(cors({
  origin: [
    'https://studio.biblenow.io',
    'https://biblenow.io',
    'https://stream.biblenow.io',
    'https://live.biblenow.io',
    'https://your-hetzner-jitsi-domain.com',
    'http://localhost:3000',
    // Allow Vercel preview URLs
    /^https:\/\/studio-biblenow.*\.vercel\.app$/,
    /^https:\/\/.*--studio-biblenow.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature']
}));
app.use(express.json());

// Handle preflight requests
app.options('*', (req, res) => {
  const allowedOrigins = [
    'https://studio.biblenow.io',
    'https://biblenow.io',
    'https://stream.biblenow.io',
    'https://live.biblenow.io',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  
  // Check if origin is in allowed list or matches Vercel pattern
  const isAllowed = allowedOrigins.includes(origin) || 
    /^https:\/\/studio-biblenow.*\.vercel\.app$/.test(origin) ||
    /^https:\/\/.*--studio-biblenow.*\.vercel\.app$/.test(origin);
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, stripe-signature');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Helper function to update account status in database
const updateAccountStatus = async (accountId, statusData) => {
  try {
    const { data, error } = await supabase
      .from('verified_profiles')
      .update({
        stripe_account_status: JSON.stringify(statusData),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', accountId)
      .select();

    if (error) {
      console.error('Error updating account status:', error);
    } else {
      console.log('Account status updated successfully:', data);
    }
  } catch (error) {
    console.error('Error in updateAccountStatus:', error);
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    if (!supabase) {
      return res.json({ 
        status: 'warning', 
        message: 'Supabase not configured - using development mode',
        timestamp: new Date().toISOString() 
      });
    }
    
    const { data, error } = await supabase
      .from('verified_profiles')
      .select('id, email')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: error.message 
      });
    }
    
    console.log('Database connection successful, found', data?.length || 0, 'records');
    res.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      recordCount: data?.length || 0
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      error: 'Database test failed', 
      details: error.message 
    });
  }
});

// Connect existing Stripe account
app.post('/api/stripe/connect-existing-account', async (req, res) => {
  console.log('Received connect-existing-account request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  
  // Log Stripe key status (without exposing the key)
  console.log('Stripe key status:', {
    hasKey: !!process.env.STRIPE_SECRET_KEY,
    keyType: process.env.STRIPE_SECRET_KEY ? 
      (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'live') : 'none',
    keyLength: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.length : 0,
    keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : 'none'
  });
  
  try {
    const { accountId, userId } = req.body;

    if (!accountId || !userId) {
      return res.status(400).json({ error: 'Account ID and User ID are required' });
    }

    console.log('Received request to connect account:', { accountId, userId });

    // First, check if the user exists in the database
    const { data: userProfile, error: userError } = await supabase
      .from('verified_profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    console.log('User profile lookup result:', { userProfile, userError });

    if (userError || !userProfile) {
      console.error('User not found in database:', userError);
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Verify the account exists and is accessible
    console.log('Attempting to retrieve account:', accountId);
    
    try {
      const account = await stripe.accounts.retrieve(accountId);
      
      if (!account) {
        return res.status(404).json({ error: 'Stripe account not found' });
      }
      
      console.log('Account retrieved successfully:', {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      });
    } catch (stripeError) {
      console.error('Stripe account retrieval error:', {
        type: stripeError.type,
        message: stripeError.message,
        code: stripeError.code
      });
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ 
          error: 'Invalid Stripe account ID',
          details: stripeError.message 
        });
      }
      
      throw stripeError;
    }

    // Check if account is already connected to another user
    const { data: existingConnection } = await supabase
      .from('verified_profiles')
      .select('id')
      .eq('stripe_account_id', accountId)
      .neq('id', userId)
      .single();

    if (existingConnection) {
      return res.status(409).json({ error: 'This Stripe account is already connected to another user' });
    }

    // Store the account ID in the database
    console.log('Attempting to update database with:', { accountId, userId });
    
    const { data, error } = await supabase
      .from('verified_profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', userId)
      .select();

    console.log('Database update result:', { data, error });

    if (error) {
      console.error('Error updating database:', error);
      return res.status(500).json({ error: 'Failed to connect account to database: ' + error.message });
    }

    if (!data || data.length === 0) {
      console.error('No rows were updated');
      return res.status(404).json({ error: 'User not found in database' });
    }

    console.log('Successfully updated user profile:', data[0]);

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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.type,
      code: error.code
    });
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid Stripe account ID or account not found in live mode',
        details: error.message 
      });
    }
    
    if (error.type === 'StripeAuthenticationError') {
      return res.status(401).json({ 
        error: 'Stripe authentication failed - check your live API key',
        details: error.message 
      });
    }
    
    // Return more specific error information
    res.status(500).json({ 
      error: 'Failed to connect account',
      details: error.message,
      type: error.type || 'Unknown'
    });
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
      .eq('id', userId)
      .single();

    if (error || !profile?.stripe_account_id) {
      return res.status(404).json({ error: 'No Stripe account found' });
    }

    // Get account details from Stripe
    try {
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
    } catch (stripeError) {
      console.error('Error retrieving account from Stripe:', stripeError);
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        return res.status(404).json({ 
          error: 'Account not found in live mode or invalid account ID',
          details: stripeError.message 
        });
      }
      
      throw stripeError;
    }
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
      .eq('id', userId)
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
        console.log('Account status:', {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          businessType: account.business_type,
          country: account.country
        });
        
        // Update account status in database
        await updateAccountStatus(account.id, {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          businessProfile: account.business_profile
        });
        break;

      case 'account.application.authorized':
        const authorizedAccount = event.data.object;
        console.log('Express account authorized:', authorizedAccount.id);
        console.log('Account type:', authorizedAccount.type);
        console.log('Account status:', {
          chargesEnabled: authorizedAccount.charges_enabled,
          payoutsEnabled: authorizedAccount.payouts_enabled,
          detailsSubmitted: authorizedAccount.details_submitted
        });
        
        // Update account status when Express account is fully authorized
        await updateAccountStatus(authorizedAccount.id, {
          chargesEnabled: authorizedAccount.charges_enabled,
          payoutsEnabled: authorizedAccount.payouts_enabled,
          detailsSubmitted: authorizedAccount.details_submitted,
          businessProfile: authorizedAccount.business_profile
        });
        break;

      case 'account.application.deauthorized':
        const deauthorizedAccount = event.data.object;
        console.log('Account deauthorized:', deauthorizedAccount.id);
        // Handle account deauthorization - remove from database
        const { error } = await supabase
          .from('verified_profiles')
          .update({ stripe_account_id: null })
          .eq('stripe_account_id', deauthorizedAccount.id);
        
        if (error) {
          console.error('Error removing deauthorized account:', error);
        } else {
          console.log('Successfully removed deauthorized account from database');
        }
        break;

      case 'account.external_account.created':
        const newBankAccount = event.data.object;
        console.log('Bank account added:', newBankAccount.id);
        console.log('Account:', newBankAccount.account);
        break;

      case 'account.external_account.updated':
        const updatedBankAccount = event.data.object;
        console.log('Bank account updated:', updatedBankAccount.id);
        break;

      case 'account.external_account.deleted':
        const deletedBankAccount = event.data.object;
        console.log('Bank account deleted:', deletedBankAccount.id);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        console.log('Payment amount:', paymentIntent.amount);
        console.log('Connected account:', paymentIntent.transfer_data?.destination);
        console.log('Application fee:', paymentIntent.application_fee_amount);
        // Handle successful payment
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        console.log('Payment failed:', failedPaymentIntent.id);
        console.log('Failure reason:', failedPaymentIntent.last_payment_error?.message);
        break;

      case 'charge.succeeded':
        const charge = event.data.object;
        console.log('Charge succeeded:', charge.id);
        console.log('Amount:', charge.amount);
        console.log('Connected account:', charge.account);
        break;

      case 'charge.failed':
        const failedCharge = event.data.object;
        console.log('Charge failed:', failedCharge.id);
        console.log('Failure reason:', failedCharge.failure_message);
        break;

      case 'transfer.created':
        const transfer = event.data.object;
        console.log('Transfer created:', transfer.id);
        console.log('Amount:', transfer.amount);
        console.log('Destination account:', transfer.destination);
        break;

      case 'transfer.failed':
        const failedTransfer = event.data.object;
        console.log('Transfer failed:', failedTransfer.id);
        console.log('Failure reason:', failedTransfer.failure_message);
        break;

      case 'person.updated':
        const person = event.data.object;
        console.log('Person updated:', person.id);
        console.log('Account:', person.account);
        console.log('Verification status:', person.verification?.status);
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

// Create Express account and onboarding link
app.post('/api/stripe/create-express-account', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user profile to get email
    const { data: userProfile, error: profileError } = await supabase
      .from('verified_profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Create Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: userProfile.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        url: 'https://studio.biblenow.io',
        mcc: '5734', // Computer Software Stores
      },
    });

    console.log('Express account created:', account.id);

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL || 'https://studio.biblenow.io'}/payments?error=refresh`,
      return_url: `${process.env.FRONTEND_URL || 'https://studio.biblenow.io'}/payments?success=true`,
      type: 'account_onboarding',
    });

    console.log('Account link created:', accountLink.url);

    // Update user profile with Stripe account ID
    const { error: updateError } = await supabase
      .from('verified_profiles')
      .update({ stripe_account_id: account.id })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      // Don't fail the request, just log the error
    }

    res.json({
      success: true,
      onboardingUrl: accountLink.url,
      accountId: account.id
    });
  } catch (error) {
    console.error('Error creating Express account:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to create Express account' 
    });
  }
});

// Process cash out request
app.post('/api/stripe/process-cash-out', async (req, res) => {
  try {
    const { userId, amount, requestId } = req.body;

    if (!userId || !amount || !requestId) {
      return res.status(400).json({ error: 'User ID, amount, and request ID are required' });
    }

    // Get user's Stripe account ID
    const { data: userProfile, error: profileError } = await supabase
      .from('verified_profiles')
      .select('stripe_account_id, shekel_balance')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    if (!userProfile.stripe_account_id) {
      return res.status(400).json({ error: 'User does not have a connected Stripe account' });
    }

    // Create a transfer to the user's connected account
    const transfer = await stripe.transfers.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      destination: userProfile.stripe_account_id,
      description: `Cash out request ${requestId}`,
      metadata: {
        request_id: requestId,
        user_id: userId,
        source: 'shekel_cash_out'
      }
    });

    console.log('Transfer created:', transfer.id);
    console.log('Transfer amount:', transfer.amount);
    console.log('Destination account:', transfer.destination);

    res.json({
      success: true,
      transferId: transfer.id,
      amount: transfer.amount
    });
  } catch (error) {
    console.error('Error processing cash out:', error);
    
    // Update the request status to failed
    if (req.body.requestId) {
      try {
        await supabase
          .from('cash_out_requests')
          .update({
            status: 'failed',
            error_message: error.message || 'Stripe transfer failed'
          })
          .eq('id', req.body.requestId);
      } catch (updateError) {
        console.error('Error updating request status:', updateError);
      }
    }

    res.status(500).json({ 
      error: error.message || 'Failed to process cash out' 
    });
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
      .eq('id', userId);

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

// Jitsi JWT signing endpoint - Updated for Render deployment
const jsonwebtoken = require('jsonwebtoken');

app.post('/api/jitsi/token', async (req, res) => {
  try {
    // Input validation
    const { room, moderator = false, name, email } = req.body || {};
    
    if (!room || typeof room !== 'string') {
      return res.status(400).json({ 
        error: 'room is required and must be a string',
        hint: 'Provide room name in request body'
      });
    }

    // JWT configuration
    const JITSI_AUD = process.env.JITSI_AUD || 'biblenow';
    const JITSI_ISS = process.env.JITSI_ISS || 'biblenow';
    const JITSI_SUB = process.env.JITSI_SUB || ''; // Optional tenant
              const JWT_SECRET = process.env.JWT_APP_SECRET;

               if (!JWT_SECRET) {
             console.error('JWT_APP_SECRET not configured');
             return res.status(500).json({
               error: 'JWT secret not configured',
               hint: 'Set JWT_APP_SECRET environment variable'
             });
           }

    // JWT algorithm (HS256 default, RS256 if specified)
    const algorithm = process.env.JITSI_JWT_ALGORITHM || 'HS256';
    
    // Room name processing (keep exact room name from request)
    const roomName = String(room).trim();
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'room cannot be empty',
        hint: 'Provide a valid room name'
      });
    }

    const now = Math.floor(Date.now() / 1000);
    
    // Build JWT payload
    const payload = {
      aud: JITSI_AUD,
      iss: JITSI_ISS,
      room: "*", // Use wildcard for room access
      nbf: now - 10, // 10 seconds before now
      exp: now + 3600, // 1 hour from now
      iat: now,
      context: {
        user: {
          name: name || 'BibleNOW User',
          email: email || undefined,
          moderator: !!moderator
        }
      }
    };

    // Add sub claim only if configured
    if (JITSI_SUB) {
      payload.sub = JITSI_SUB;
    }

    console.log('Generating JWT token:', {
      aud: payload.aud,
      iss: payload.iss,
      room: payload.room,
      sub: payload.sub || 'none',
      moderator: payload.context.user.moderator,
      algorithm
    });

    // Sign JWT
    const token = jsonwebtoken.sign(payload, JWT_SECRET, { algorithm });
    
    console.log('JWT token generated successfully for room:', roomName);
    
    // Return token in expected format
    return res.json({ 
      jwt: token,
      room: roomName,
      expires: payload.exp
    });
    
  } catch (error) {
    console.error('Error creating Jitsi JWT token:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({ 
        error: 'JWT signing failed',
        hint: 'Check JWT secret and algorithm configuration'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create JWT token',
      hint: 'Internal server error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 