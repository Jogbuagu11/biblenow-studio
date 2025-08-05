import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin access
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface CashOutRequest {
  id: string;
  user_id: string;
  amount: number; // Amount in Shekelz
  cash_amount: number; // Amount in USD cents
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stripe_transfer_id?: string;
  created_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface CashOutSummary {
  total_cashed_out: number;
  pending_amount: number;
  available_balance: number;
  is_verified_user: boolean;
}

export interface CashOutEligibility {
  eligible: boolean;
  balance: number;
  minAmount: number;
  error?: string;
}

// Helper function
const formatShekels = (amount: number): string => {
  return `${amount.toLocaleString()} Shekelz`;
};

class CashOutService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  // Check if user is eligible for cash out
  async checkEligibility(userId: string): Promise<CashOutEligibility> {
    try {
      console.log('cashOutService: Starting eligibility check for user:', userId);
      
      // Get user's verified profile
      console.log('cashOutService: Fetching verified profile...');
      const { data: verifiedProfile, error: profileError } = await supabaseAdmin
        .from('verified_profiles')
        .select('shekel_balance, ministry_name, stripe_account_id')
        .eq('id', userId)
        .single();

      console.log('cashOutService: Profile fetch result:', { verifiedProfile, profileError });

      if (profileError) {
        console.error('cashOutService: Error fetching profile:', profileError);
        return {
          eligible: false,
          balance: 0,
          minAmount: 2000,
          error: `Profile error: ${profileError.message}`
        };
      }

      if (!verifiedProfile) {
        console.log('cashOutService: No verified profile found');
        return {
          eligible: false,
          balance: 0,
          minAmount: 2000,
          error: 'User profile not found'
        };
      }

      console.log('cashOutService: Verified profile found:', verifiedProfile);

      const balance = verifiedProfile.shekel_balance || 0;
      const isVerifiedUser = !!(verifiedProfile.ministry_name);
      const hasStripeAccount = !!(verifiedProfile.stripe_account_id);
      const minAmount = 2000; // $20 minimum

      console.log('cashOutService: Eligibility factors:', {
        balance,
        isVerifiedUser,
        hasStripeAccount,
        minAmount
      });

      // Check if user meets all requirements
      const eligible = isVerifiedUser && hasStripeAccount && balance >= minAmount;

      console.log('cashOutService: Final eligibility result:', eligible);

      return {
        eligible,
        balance,
        minAmount,
        error: eligible ? undefined : 
          !isVerifiedUser ? 'User not verified' :
          !hasStripeAccount ? 'Stripe account not set up' :
          balance < minAmount ? `Insufficient balance (minimum: ${formatShekels(minAmount)})` :
          'Unknown eligibility issue'
      };
    } catch (error) {
      console.error('cashOutService: Exception in checkEligibility:', error);
      return {
        eligible: false,
        balance: 0,
        minAmount: 2000,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get cash out summary for user
  async getCashOutSummary(userId: string): Promise<CashOutSummary> {
    try {
      console.log('cashOutService: Getting cash out summary for user:', userId);
      
      // Get user balance
      const { data: verifiedProfile } = await supabaseAdmin
        .from('verified_profiles')
        .select('shekel_balance, ministry_name')
        .eq('id', userId)
        .single();

      console.log('cashOutService: Verified profile for summary:', verifiedProfile);

      const isVerifiedUser = !!(verifiedProfile && verifiedProfile.ministry_name);
      const availableBalance = verifiedProfile?.shekel_balance || 0;

      console.log('cashOutService: Is verified user:', isVerifiedUser, 'Available balance:', availableBalance);

      // Try to get cash out history, but don't fail if table doesn't exist
      let totalCashedOut = 0;
      let pendingAmount = 0;

      try {
        const { data: cashOutRequests } = await supabaseAdmin
          .from('cash_out_requests')
          .select('amount, status')
          .eq('user_id', userId);

        console.log('cashOutService: Cash out requests:', cashOutRequests);

        totalCashedOut = cashOutRequests
          ?.filter((req: any) => req.status === 'completed')
          .reduce((sum: number, req: any) => sum + req.amount, 0) || 0;

        pendingAmount = cashOutRequests
          ?.filter((req: any) => req.status === 'pending' || req.status === 'processing')
          .reduce((sum: number, req: any) => sum + req.amount, 0) || 0;
      } catch (tableError) {
        console.log('cashOutService: Cash out requests table not accessible, using defaults:', tableError);
        // Table doesn't exist or is not accessible, use defaults
        totalCashedOut = 0;
        pendingAmount = 0;
      }

      const summary = {
        total_cashed_out: totalCashedOut,
        pending_amount: pendingAmount,
        available_balance: availableBalance,
        is_verified_user: isVerifiedUser
      };

      console.log('cashOutService: Summary calculated:', summary);
      return summary;
    } catch (error) {
      console.error('cashOutService: Error getting cash out summary:', error);
      return {
        total_cashed_out: 0,
        pending_amount: 0,
        available_balance: 0,
        is_verified_user: false
      };
    }
  }

  // Request cash out
  async requestCashOut(userId: string, amount: number): Promise<{ success: boolean; error?: string; requestId?: string }> {
    try {
      // Check eligibility first
      const eligibility = await this.checkEligibility(userId);
      if (!eligibility.eligible) {
        return { success: false, error: eligibility.error };
      }

      if (amount > eligibility.balance) {
        return { success: false, error: 'Insufficient balance' };
      }

      if (amount < eligibility.minAmount) {
        return { success: false, error: `Minimum cash out amount is ${eligibility.minAmount} Shekelz` };
      }

      // Calculate cash amount (1 Shekel = $0.01, so 100 Shekelz = $1)
      const cashAmountCents = Math.round(amount * 0.01 * 100); // Convert to cents

      // Create cash out request
      const { data: cashOutRequest, error } = await supabaseAdmin
        .from('cash_out_requests')
        .insert({
          user_id: userId,
          amount: amount,
          cash_amount: cashAmountCents,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cash out request:', error);
        return { success: false, error: 'Failed to create cash out request' };
      }

      // Deduct from user's balance
      const { error: balanceError } = await supabaseAdmin
        .from('verified_profiles')
        .update({ shekel_balance: eligibility.balance - amount })
        .eq('id', userId);

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        // Rollback the cash out request
        await supabaseAdmin
          .from('cash_out_requests')
          .delete()
          .eq('id', cashOutRequest.id);
        return { success: false, error: 'Failed to update balance' };
      }

      // Process the cash out via Stripe
      try {
        const response = await fetch(`${this.apiUrl}/stripe/process-cash-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            amount: cashAmountCents,
            requestId: cashOutRequest.id
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process cash out');
        }

        const result = await response.json();
        
        // Update the request with Stripe transfer ID
        await supabaseAdmin
          .from('cash_out_requests')
          .update({ 
            stripe_transfer_id: result.transferId,
            status: 'processing'
          })
          .eq('id', cashOutRequest.id);

        return { success: true, requestId: cashOutRequest.id };
      } catch (stripeError) {
        console.error('Stripe processing error:', stripeError);
        
        // Rollback the balance deduction
        await supabaseAdmin
          .from('verified_profiles')
          .update({ shekel_balance: eligibility.balance })
          .eq('id', userId);

        // Update request status to failed
        await supabaseAdmin
          .from('cash_out_requests')
          .update({ 
            status: 'failed',
            error_message: stripeError instanceof Error ? stripeError.message : 'Stripe processing failed'
          })
          .eq('id', cashOutRequest.id);

        return { success: false, error: 'Failed to process payment. Your balance has been restored.' };
      }
    } catch (error) {
      console.error('Error requesting cash out:', error);
      return { success: false, error: 'Failed to process cash out request' };
    }
  }

  // Get cash out history
  async getCashOutHistory(userId: string): Promise<CashOutRequest[]> {
    try {
      const { data: requests, error } = await supabaseAdmin
        .from('cash_out_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cash out history:', error);
        return [];
      }

      return requests || [];
    } catch (error) {
      console.error('Error getting cash out history:', error);
      return [];
    }
  }

  // Test method to check database connectivity
  async testDatabaseConnection(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('cashOutService: Testing database connection for user:', userId);
      
      // Test basic profile access
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('verified_profiles')
        .select('id, email')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('cashOutService: Profile access error:', profileError);
        return { success: false, error: `Profile access failed: ${profileError.message}` };
      }

      console.log('cashOutService: Profile access successful:', profile);

      // Test cash_out_requests table access (this might fail if table doesn't exist)
      try {
        const { data: requests, error: requestsError } = await supabaseAdmin
          .from('cash_out_requests')
          .select('id')
          .limit(1);

        if (requestsError) {
          console.error('cashOutService: Cash out requests table error:', requestsError);
          return { success: false, error: `Cash out requests table error: ${requestsError.message}` };
        }

        console.log('cashOutService: Cash out requests table access successful, found', requests?.length || 0, 'rows');
      } catch (tableError) {
        console.error('cashOutService: Cash out requests table access failed:', tableError);
        return { success: false, error: `Cash out requests table doesn't exist or is inaccessible` };
      }

      return { success: true };
    } catch (error) {
      console.error('cashOutService: Database connection test failed:', error);
      return { success: false, error: `Database connection failed: ${error}` };
    }
  }

  // Simple test method for empty tables
  async testEmptyTableHandling(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('cashOutService: Testing empty table handling for user:', userId);
      
      // Test getCashOutHistory with empty table
      const history = await this.getCashOutHistory(userId);
      console.log('cashOutService: History result (should be empty array):', history);
      
      // Test getCashOutSummary with empty table
      const summary = await this.getCashOutSummary(userId);
      console.log('cashOutService: Summary result:', summary);
      
      // Test checkEligibility
      const eligibility = await this.checkEligibility(userId);
      console.log('cashOutService: Eligibility result:', eligibility);
      
      return { 
        success: true, 
        message: `All methods working. History: ${history.length} items, Summary: ${summary.total_cashed_out} cashed out, Eligible: ${eligibility.eligible}` 
      };
    } catch (error) {
      console.error('cashOutService: Empty table test failed:', error);
      return { success: false, message: `Test failed: ${error}` };
    }
  }
}

const cashOutService = new CashOutService();
export default cashOutService; 