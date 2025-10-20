const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Process creator bonus payout via Stripe
router.post('/process-bonus-payout', async (req, res) => {
  try {
    const { payoutId } = req.body;

    if (!payoutId) {
      return res.status(400).json({ error: 'Payout ID is required' });
    }

    // Get payout record
    const { data: payout, error: payoutError } = await supabase
      .from('creator_payouts')
      .select(`
        *,
        creator:verified_profiles!creator_payouts_creator_id_fkey(
          id,
          stripe_account_id,
          ministry_name,
          email
        )
      `)
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return res.status(404).json({ error: 'Payout record not found' });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: 'Payout is not in pending status' });
    }

    if (!payout.creator.stripe_account_id) {
      return res.status(400).json({ error: 'Creator does not have a connected Stripe account' });
    }

    // Update payout status to processing
    await supabase
      .from('creator_payouts')
      .update({ status: 'processing' })
      .eq('id', payoutId);

    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: payout.bonus_amount_usd, // Amount in cents
      currency: 'usd',
      destination: payout.creator.stripe_account_id,
      description: `Creator Support Bonus - ${payout.period_start} to ${payout.period_end}`,
      metadata: {
        payout_id: payoutId,
        creator_id: payout.creator_id,
        period_start: payout.period_start,
        period_end: payout.period_end,
        total_shekelz: payout.total_shekelz,
        bonus_percentage: payout.bonus_percentage,
        source: 'creator_support_bonus'
      }
    });

    // Update payout record with Stripe transfer ID
    await supabase
      .from('creator_payouts')
      .update({
        stripe_transfer_id: transfer.id,
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', payoutId);

    // Update creator's total payouts
    await supabase
      .from('verified_profiles')
      .update({
        total_payouts_usd: supabase.raw('total_payouts_usd + ?', [payout.bonus_amount_usd]),
        last_payout_date: new Date().toISOString()
      })
      .eq('id', payout.creator_id);

    console.log('Bonus payout processed successfully:', {
      payoutId,
      transferId: transfer.id,
      amount: payout.bonus_amount_usd,
      creator: payout.creator.ministry_name
    });

    res.json({
      success: true,
      transferId: transfer.id,
      amount: payout.bonus_amount_usd,
      creator: payout.creator.ministry_name
    });

  } catch (error) {
    console.error('Error processing bonus payout:', error);

    // Update payout status to failed if we have a payoutId
    if (req.body.payoutId) {
      await supabase
        .from('creator_payouts')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', req.body.payoutId);
    }

    res.status(500).json({ 
      error: 'Failed to process bonus payout',
      detail: error.message 
    });
  }
});

// Get creator payout history
router.get('/history/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const { data: payouts, error } = await supabase
      .from('creator_payouts')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch payout history' });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('creator_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', creatorId);

    res.json({
      payouts,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payout history:', error);
    res.status(500).json({ error: 'Failed to fetch payout history' });
  }
});

// Get creator payout summary
router.get('/summary/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    // Get creator info
    const { data: creator, error: creatorError } = await supabase
      .from('verified_profiles')
      .select('id, ministry_name, total_payouts_usd, last_payout_date, next_payout_date, payouts_enabled')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Get current month's shekel gifts
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data: monthlyGifts, error: giftsError } = await supabase
      .from('shekel_gifts')
      .select('amount')
      .eq('recipient_id', creatorId)
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    if (giftsError) {
      return res.status(500).json({ error: 'Failed to fetch monthly shekel gifts' });
    }

    const monthlyData = {
      total_shekelz: monthlyGifts?.reduce((sum, g) => sum + g.amount, 0) || 0,
      total_usd_gross: 0, // Will be calculated from Shekelz
      total_usd_net: 0, // Will be calculated from Shekelz
      donation_count: monthlyGifts?.length || 0
    };

    // Calculate USD values from Shekelz
    const monthlyUsdValue = monthlyData.total_shekelz * 0.10; // $0.10 per Shekel
    monthlyData.total_usd_gross = Math.round(monthlyUsdValue);
    monthlyData.total_usd_net = Math.round(monthlyUsdValue * 0.90); // Assuming 10% platform fee

    // Calculate estimated bonus (80% of Shekelz value × $0.10)
    const shekelz_value_usd = monthlyData.total_shekelz * 0.10;
    const estimated_bonus_usd = Math.round(shekelz_value_usd * 0.80);

    res.json({
      creator: {
        id: creator.id,
        ministry_name: creator.ministry_name,
        total_payouts_usd: creator.total_payouts_usd,
        last_payout_date: creator.last_payout_date,
        next_payout_date: creator.next_payout_date,
        payouts_enabled: creator.payouts_enabled
      },
      monthly_data: monthlyData,
      estimated_bonus_usd,
      stripe_status: creator.payouts_enabled ? 'enabled' : 'disabled'
    });

  } catch (error) {
    console.error('Error fetching payout summary:', error);
    res.status(500).json({ error: 'Failed to fetch payout summary' });
  }
});

module.exports = router;