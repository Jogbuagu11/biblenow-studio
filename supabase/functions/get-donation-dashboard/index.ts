import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface DashboardData {
  total_shekelz: number;
  total_usd: number;
  monthly_shekelz: number;
  monthly_usd: number;
  estimated_bonus_usd: number;
  last_payout_date: string | null;
  next_payout_date: string | null;
  stripe_status: 'enabled' | 'disabled';
  history: Array<{
    date: string;
    viewer: string;
    shekelz: number;
    usd: number;
    source: string;
    context_id?: string;
    gift_type: string;
    thanked_at?: string;
  }>;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

serve(async (req: Request) => {
  try {
    const { creator_id, page = 1, limit = 10 } = await req.json();
    
    if (!creator_id) {
      return new Response(JSON.stringify({ error: 'Creator ID is required' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = (await import('https://esm.sh/@supabase/supabase-js@2')).createClient(supabaseUrl, serviceKey);

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Get creator info
    const { data: creator, error: creatorError } = await supabase
      .from('verified_profiles')
      .select('id, ministry_name, total_payouts_usd, last_payout_date, next_payout_date, payouts_enabled')
      .eq('id', creator_id)
      .single();

    if (creatorError || !creator) {
      return new Response(JSON.stringify({ error: 'Creator not found' }), { status: 404 });
    }

    // Get total shekel gifts count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('shekel_gifts')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', creator_id)
      .eq('status', 'completed');

    if (countError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch shekel gifts count' }), { status: 500 });
    }

    // Get paginated shekel gifts
    const { data: gifts, error: giftsError } = await supabase
      .from('shekel_gifts')
      .select(`
        id,
        amount,
        gift_type,
        context,
        context_id,
        created_at,
        thanked_at,
        sender_id,
        sender:verified_profiles!shekel_gifts_sender_id_fkey(ministry_name, first_name, last_name)
      `)
      .eq('recipient_id', creator_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (giftsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch shekel gifts' }), { status: 500 });
    }

    // Get current month's shekel gifts for monthly stats
    const currentDate = new Date();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data: monthlyGifts, error: monthlyError } = await supabase
      .from('shekel_gifts')
      .select('amount')
      .eq('recipient_id', creator_id)
      .eq('status', 'completed')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    if (monthlyError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch monthly shekel gifts' }), { status: 500 });
    }

    // Get all-time totals
    const { data: allTimeGifts, error: allTimeError } = await supabase
      .from('shekel_gifts')
      .select('amount')
      .eq('recipient_id', creator_id)
      .eq('status', 'completed');

    if (allTimeError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch all-time shekel gifts' }), { status: 500 });
    }

    // Calculate totals from shekel_gifts
    const totalShekelz = allTimeGifts?.reduce((sum, g) => sum + g.amount, 0) || 0;
    const totalUsd = totalShekelz * 0.10; // $0.10 per Shekel
    const monthlyShekelz = monthlyGifts?.reduce((sum, g) => sum + g.amount, 0) || 0;
    const monthlyUsd = monthlyShekelz * 0.10; // $0.10 per Shekel

    // Calculate estimated bonus (80% of total Shekelz value × $0.10)
    const shekelzValueUsd = totalShekelz * 0.10; // $0.10 per Shekel
    const estimatedBonusUsd = Math.round(shekelzValueUsd * 0.80);

    // Format history from shekel_gifts
    const history = gifts?.map(gift => {
      const senderName = gift.sender?.ministry_name || 
                        `${gift.sender?.first_name || ''} ${gift.sender?.last_name || ''}`.trim() ||
                        'Anonymous';
      
      return {
        date: gift.created_at,
        viewer: senderName,
        shekelz: gift.amount,
        usd: gift.amount * 0.10, // $0.10 per Shekel
        source: gift.context || 'unknown',
        context_id: gift.context_id,
        gift_type: gift.gift_type,
        thanked_at: gift.thanked_at
      };
    }) || [];

    // Calculate pagination info
    const totalItems = totalCount || 0;
    const totalPages = Math.ceil(totalItems / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPreviousPage = pageNum > 1;

    const dashboardData: DashboardData = {
      total_shekelz: totalShekelz,
      total_usd: totalUsd,
      monthly_shekelz: monthlyShekelz,
      monthly_usd: monthlyUsd,
      estimated_bonus_usd: estimatedBonusUsd,
      last_payout_date: creator.last_payout_date,
      next_payout_date: creator.next_payout_date,
      stripe_status: creator.payouts_enabled ? 'enabled' : 'disabled',
      history,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: limitNum,
        has_next_page: hasNextPage,
        has_previous_page: hasPreviousPage
      }
    };

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('Error fetching donation dashboard:', e);
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), { status: 500 });
  }
});
