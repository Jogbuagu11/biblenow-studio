import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const { sender_id, recipient_id, amount, note, room_id } = await req.json();
    if (!sender_id || !recipient_id || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = (await import('https://esm.sh/@supabase/supabase-js@2')).createClient(supabaseUrl, serviceKey);

    // Check balance
    const { data: senderProfile } = await supabase.from('profiles').select('id, shekel_balance').eq('id', sender_id).maybeSingle();
    const { data: verified } = await supabase.from('verified_profiles').select('id, shekel_balance, ministry_name').eq('id', recipient_id).maybeSingle();
    const senderBalance = senderProfile?.shekel_balance ?? 0;
    if (senderBalance < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), { status: 400 });
    }

    // Perform transaction
    const { data: result, error } = await supabase.rpc('perform_shekel_gift', {
      p_sender_id: sender_id,
      p_recipient_id: recipient_id,
      p_amount: amount,
      p_message: note ?? null,
      p_context: 'livestream',
      p_context_id: room_id ?? null
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, gift_id: result?.gift_id }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), { status: 500 });
  }
}); 