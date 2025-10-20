import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface PayoutRequest {
  creator_id: string;
  period_start: string;
  period_end: string;
  bonus_percentage?: number;
}

interface PayoutData {
  total_shekelz: number;
  total_usd_gross: number;
  total_usd_net: number;
  bonus_amount_usd: number;
  donation_count: number;
}

serve(async (req: Request) => {
  try {
    const { creator_id, period_start, period_end, bonus_percentage = 80 }: PayoutRequest = await req.json();
    
    if (!creator_id || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = (await import('https://esm.sh/@supabase/supabase-js@2')).createClient(supabaseUrl, serviceKey);

    // Validate creator exists and has Stripe account
    const { data: creator, error: creatorError } = await supabase
      .from('verified_profiles')
      .select('id, stripe_account_id, payouts_enabled, minimum_payout_threshold')
      .eq('id', creator_id)
      .single();

    if (creatorError || !creator) {
      return new Response(JSON.stringify({ error: 'Creator not found' }), { status: 404 });
    }

    if (!creator.stripe_account_id) {
      return new Response(JSON.stringify({ error: 'Creator does not have a connected Stripe account' }), { status: 400 });
    }

    if (!creator.payouts_enabled) {
      return new Response(JSON.stringify({ error: 'Payouts are not enabled for this creator' }), { status: 400 });
    }

    // Calculate payout data for the period from shekel_gifts table
    const { data: gifts, error: giftsError } = await supabase
      .from('shekel_gifts')
      .select('amount, gift_type, context, context_id, created_at')
      .eq('recipient_id', creator_id)
      .eq('status', 'completed')
      .gte('created_at', period_start)
      .lte('created_at', period_end);

    if (giftsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch shekel gifts' }), { status: 500 });
    }

    const payoutData: PayoutData = {
      total_shekelz: gifts?.reduce((sum, g) => sum + g.amount, 0) || 0,
      total_usd_gross: 0, // Will be calculated from Shekelz
      total_usd_net: 0, // Will be calculated from Shekelz
      bonus_amount_usd: 0,
      donation_count: gifts?.length || 0
    };

    // Calculate USD values from Shekelz (since shekel_gifts doesn't store USD)
    const shekelz_value_usd = payoutData.total_shekelz * 0.10; // $0.10 per Shekel
    payoutData.total_usd_gross = Math.round(shekelz_value_usd);
    payoutData.total_usd_net = Math.round(shekelz_value_usd * 0.90); // Assuming 10% platform fee
    
    // Calculate bonus amount (80% of total Shekelz value × $0.10)
    payoutData.bonus_amount_usd = Math.round(shekelz_value_usd * (bonus_percentage / 100));

    // Check if payout meets minimum threshold
    if (payoutData.bonus_amount_usd < (creator.minimum_payout_threshold || 1000)) {
      return new Response(JSON.stringify({ 
        error: 'Payout amount below minimum threshold',
        bonus_amount_usd: payoutData.bonus_amount_usd,
        minimum_threshold: creator.minimum_payout_threshold || 1000
      }), { status: 400 });
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('creator_payouts')
      .insert({
        creator_id,
        period_start,
        period_end,
        total_shekelz: payoutData.total_shekelz,
        total_usd_gross: payoutData.total_usd_gross,
        total_usd_net: payoutData.total_usd_net,
        bonus_percentage,
        bonus_amount_usd: payoutData.bonus_amount_usd,
        status: 'pending'
      })
      .select()
      .single();

    if (payoutError) {
      return new Response(JSON.stringify({ error: 'Failed to create payout record' }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      payout_id: payout.id,
      payout_data: payoutData,
      message: 'Payout record created successfully. Use Stripe API to process the actual transfer.'
    }), { status: 200 });

  } catch (e) {
    console.error('Error processing creator payout:', e);
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), { status: 500 });
  }
});
