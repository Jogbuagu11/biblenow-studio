# BibleNOW Studio Server

Backend server for BibleNOW Studio with Stripe Connect integration for existing accounts.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Fill in your environment variables in `.env`:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET_STUDIO`: Your Stripe webhook secret
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `FRONTEND_URL`: Your frontend URL (e.g., http://localhost:3000)

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Stripe Connect (Existing Accounts)

- `POST /api/stripe/connect-existing-account` - Connect existing Stripe account
- `GET /api/stripe/account-status` - Get user's connected Stripe account status
- `POST /api/stripe/verify-account-ownership` - Verify account ownership
- `POST /api/stripe/account-login-link` - Create login link for Stripe dashboard
- `POST /api/stripe/create-payment-intent` - Create payment intent for donations
- `POST /api/stripe/disconnect-account` - Disconnect Stripe account
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Health Check

- `GET /api/health` - Server health check

## Stripe Connect Flow (Existing Accounts)

1. **User enters their Stripe Account ID**
   - Frontend calls `/api/stripe/connect-existing-account`
   - Server verifies account exists and is accessible
   - Server checks if account is already connected to another user
   - Server stores account ID in database

2. **Account verification**
   - Server validates the Stripe account ID
   - Checks account ownership and permissions
   - Returns account status and business profile

3. **Account status check**
   - Frontend calls `/api/stripe/account-status`
   - Server retrieves account from Stripe
   - Server returns account status (pending, verified, etc.)

4. **Security features**
   - Account ownership verification
   - Prevents duplicate connections
   - Validates account accessibility

## Security Features

### Account Ownership Verification
- Verifies that the Stripe account ID is valid and accessible
- Prevents connecting accounts that don't exist
- Checks for duplicate connections across users

### Duplicate Prevention
- Ensures one Stripe account can only be connected to one user
- Prevents account sharing between multiple streamers

### Account Validation
- Validates account ID format and existence
- Checks account permissions and capabilities
- Returns detailed error messages for invalid accounts

## Webhook Setup

1. Go to your Stripe Dashboard
2. Navigate to Developers > Webhooks
3. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Select events: `account.updated`, `payment_intent.succeeded`
5. Copy the webhook secret to your `.env` file as `STRIPE_WEBHOOK_SECRET_STUDIO`

## Database Integration

The server integrates with your Supabase database:

- **verified_profiles** table stores `stripe_account_id`
- Account status is retrieved from Stripe API
- Webhooks update account status in real-time
- Business profile information is stored and displayed

## Payment Processing

### Connected Account Payments
- Payments are processed through the connected Stripe account
- Platform fees are automatically calculated
- Payment intents are created with the connected account context

### Fee Structure
- 10% platform fee on all donations
- Fees are automatically deducted from payments
- Connected accounts receive the remaining amount

## Development

- Server runs on port 3001 by default
- CORS enabled for localhost:3000
- Hot reload with nodemon
- Environment variables loaded from `.env`

## Production Deployment

1. Set `NODE_ENV=production`
2. Update `FRONTEND_URL` to your production domain
3. Use production Stripe keys
4. Set up proper webhook endpoints
5. Configure CORS for production domains
6. Ensure proper SSL certificates for webhooks 