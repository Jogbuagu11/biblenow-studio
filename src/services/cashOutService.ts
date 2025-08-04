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

class CashOutService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  // Check if user is eligible for cash out (verified user with sufficient balance)
  async checkEligibility(userId: string): Promise<{ eligible: boolean; balance: number; minAmount: number; error?: string }> {
    try {
      // Check if user is verified
      const { data: verifiedProfile } = await supabaseAdmin
        .from('verified_profiles')
        .select('shekel_balance, ministry_name, stripe_account_id')
        .eq('id', userId)
        .single();

      if (!verifiedProfile || !verifiedProfile.ministry_name) {
        return { eligible: false, balance: 0, minAmount: 2000, error: 'Only verified users can cash out Shekelz' };
      }

      if (!verifiedProfile.stripe_account_id) {
        return { eligible: false, balance: verifiedProfile.shekel_balance || 0, minAmount: 2000, error: 'Please connect your Stripe account in Payment Settings' };
      }

      const balance = verifiedProfile.shekel_balance || 0;
      const minAmount = 2000; // 2000 Shekelz = $20 minimum

      if (balance < minAmount) {
        return { eligible: false, balance, minAmount, error: `Minimum cash out amount is ${minAmount} Shekelz ($20)` };
      }

      return { eligible: true, balance, minAmount };
    } catch (error) {
      console.error('Error checking cash out eligibility:', error);
      return { eligible: false, balance: 0, minAmount: 2000, error: 'Failed to check eligibility' };
    }
  }

  // Get cash out summary for user
  async getCashOutSummary(userId: string): Promise<CashOutSummary> {
    try {
      // Get user balance
      const { data: verifiedProfile } = await supabaseAdmin
        .from('verified_profiles')
        .select('shekel_balance, ministry_name')
        .eq('id', userId)
        .single();

      const isVerifiedUser = !!(verifiedProfile && verifiedProfile.ministry_name);
      const availableBalance = verifiedProfile?.shekel_balance || 0;

      // Get cash out history
      const { data: cashOutRequests } = await supabaseAdmin
        .from('cash_out_requests')
        .select('amount, status')
        .eq('user_id', userId);

      const totalCashedOut = cashOutRequests
        ?.filter((req: any) => req.status === 'completed')
        .reduce((sum: number, req: any) => sum + req.amount, 0) || 0;

      const pendingAmount = cashOutRequests
        ?.filter((req: any) => req.status === 'pending' || req.status === 'processing')
        .reduce((sum: number, req: any) => sum + req.amount, 0) || 0;

      return {
        total_cashed_out: totalCashedOut,
        pending_amount: pendingAmount,
        available_balance: availableBalance,
        is_verified_user: isVerifiedUser
      };
    } catch (error) {
      console.error('Error getting cash out summary:', error);
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
}

export default new CashOutService(); 