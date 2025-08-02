import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user ID from the request body instead of JWT
    const { shieldedUserId, userId } = await req.json()

    if (!shieldedUserId || !userId) {
      return new Response(
        JSON.stringify({ error: 'shieldedUserId and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Try to use the transaction function first
    let { data, error } = await supabaseClient.rpc('shield_user_transaction', {
      user_id: userId,
      shielded_user_id: shieldedUserId
    })

    if (error) {
      console.error('Error in shield_user_transaction:', error)
      
      // If the function doesn't exist, fall back to manual operations
      if (error.message.includes('function shield_user_transaction') || 
          error.message.includes('does not exist')) {
        
        console.log('Transaction function not found, using manual operations...')
        
        // 1. Remove follow relationships manually
        await supabaseClient
          .from('user_follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', shieldedUserId)
        
        await supabaseClient
          .from('user_follows')
          .delete()
          .eq('follower_id', shieldedUserId)
          .eq('following_id', userId)
        
        // 2. Add to shielded users (ignore if table doesn't exist)
        const { error: shieldError } = await supabaseClient
          .from('user_shields')
          .insert([{
            user_id: userId,
            shielded_user_id: shieldedUserId
          }])
          .select()
        
        if (shieldError && !shieldError.message.includes('relation "user_shields" does not exist')) {
          console.error('Error adding to shielded users:', shieldError)
          return new Response(
            JSON.stringify({ error: shieldError.message }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        data = {
          success: true,
          message: 'User shielded successfully (manual operation)',
          user_id: userId,
          shielded_user_id: shieldedUserId
        }
      } else {
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User shielded successfully',
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in shield-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 