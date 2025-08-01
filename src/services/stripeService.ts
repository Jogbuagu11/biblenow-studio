import { loadStripe } from '@stripe/stripe-js';

// Debug: Log the environment variable
console.log('Stripe Publishable Key:', process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? 'Set' : 'Not set');

// Initialize Stripe with publishable key (with fallback for development)
const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

export interface StripeAccount {
  id: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  loginLink?: string;
  businessProfile?: {
    name?: string;
    url?: string;
    supportEmail?: string;
  };
}

export interface StripeAccountLink {
  url: string;
  expiresAt: string;
}

class StripeService {
  private apiUrl: string;

  constructor() {
    // In production, use the Render backend URL if REACT_APP_API_URL is not set
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultApiUrl = isProduction 
      ? 'https://biblenow-studio-backend.onrender.com/api'
      : 'http://localhost:3001/api';
    
    this.apiUrl = process.env.REACT_APP_API_URL || defaultApiUrl;
  }

  // Get Stripe instance
  async getStripe() {
    return await stripePromise;
  }

  // Connect existing Stripe account (for streamers who already have accounts)
  async connectExistingAccount(accountId: string, userId: string): Promise<StripeAccount> {
    try {
      console.log('Attempting to connect Stripe account:', { accountId, userId, apiUrl: this.apiUrl });
      
      const response = await fetch(`${this.apiUrl}/stripe/connect-existing-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId, userId }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to connect existing account: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Connection successful:', result);
      return result;
    } catch (error) {
      console.error('Error connecting existing Stripe account:', error);
      throw error;
    }
  }

  // Get current user's connected Stripe account status
  async getAccountStatus(userId: string): Promise<StripeAccount | null> {
    try {
      console.log('Getting account status for user:', userId, 'API URL:', this.apiUrl);
      
      const response = await fetch(`${this.apiUrl}/stripe/account-status?userId=${userId}`);

      console.log('Account status response:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          // No account found
          console.log('No account found for user');
          return null;
        }
        const errorText = await response.text();
        console.error('Account status error:', errorText);
        throw new Error(`Failed to get account status: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Account status result:', result);
      return result;
    } catch (error) {
      console.error('Error getting Stripe account status:', error);
      return null;
    }
  }

  // Create a payment intent for donations (using connected account)
  async createPaymentIntent(
    amount: number, 
    connectedAccountId: string,
    currency: string = 'usd', 
    metadata?: Record<string, string>
  ) {
    try {
      const response = await fetch(`${this.apiUrl}/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          metadata,
          connectedAccountId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create payment intent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Get account login link for connected account
  async getAccountLoginLink(accountId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.apiUrl}/stripe/account-login-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get login link: ${response.statusText}`);
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Error getting account login link:', error);
      return null;
    }
  }

  // Verify Stripe account ownership (for security)
  async verifyAccountOwnership(accountId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/stripe/verify-account-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId, userId }),
      });

      if (!response.ok) {
        return false;
      }

      const { verified } = await response.json();
      return verified;
    } catch (error) {
      console.error('Error verifying account ownership:', error);
      return false;
    }
  }

  // Handle webhook events (for account updates)
  async handleWebhook(event: any) {
    try {
      const response = await fetch(`${this.apiUrl}/stripe/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Webhook handling failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();
export default stripeService; 