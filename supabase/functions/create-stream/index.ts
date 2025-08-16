import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StreamData {
  title: string;
  description?: string;
  platform?: string;
  stream_type?: string;
  stream_mode?: string;
  livestream_type?: string;
  thumbnail_url?: string;
  scheduled_at?: string;
  embed_url?: string;
  stream_key?: string;
  room_name?: string;
  redirect_url?: string;
  tags?: string[];
  jitsi_room_config?: any;
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

    // Get the request data
    const { userId, streamData } = await req.json()

    if (!userId || !streamData) {
      return new Response(
        JSON.stringify({ error: 'userId and streamData are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required fields
    if (!streamData.title) {
      return new Response(
        JSON.stringify({ error: 'Stream title is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user profile to verify they exist and get their name
    const { data: profile, error: profileError } = await supabaseClient
      .from('verified_profiles')
      .select('id, first_name, last_name')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found or not verified' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already has an active stream
    const { data: activeStream, error: activeStreamError } = await supabaseClient
      .from('livestreams')
      .select('id')
      .eq('streamer_id', userId)
      .eq('is_live', true)
      .eq('status', 'active')
      .single()

    if (activeStreamError && !activeStreamError.message.includes('No rows found')) {
      return new Response(
        JSON.stringify({ error: 'Error checking active streams' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (activeStream) {
      return new Response(
        JSON.stringify({ error: 'You already have an active livestream. Please end it before starting a new one.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare stream data
    const now = new Date().toISOString()
    const roomId = streamData.room_name || `stream_${Date.now()}`
    
    const newStreamData = {
      streamer_id: userId,
      title: streamData.title,
      description: streamData.description || null,
      is_live: true,
      started_at: now,
      ended_at: null,
      platform: streamData.platform || 'biblenow_video',
      stream_type: streamData.stream_type || 'video',
      stream_mode: streamData.stream_mode || 'solo',
      thumbnail_url: streamData.thumbnail_url || null,
      scheduled_at: streamData.scheduled_at || null,
      embed_url: streamData.embed_url || null,
      stream_key: streamData.stream_key || null,
      room_name: roomId,
      redirect_url: streamData.redirect_url || null,
      tags: streamData.tags || [],
      jitsi_room_config: streamData.jitsi_room_config || {},
      status: 'active',
      viewer_count: 0,
      max_viewers: 0,
      flag_count: 0,
      is_hidden: false,
      updated_at: now
    }

    // Create the livestream
    const { data: newStream, error: streamError } = await supabaseClient
      .from('livestreams')
      .insert([newStreamData])
      .select()
      .single()

    if (streamError) {
      console.error('Error creating stream:', streamError)
      return new Response(
        JSON.stringify({ error: 'Failed to create stream' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // After stream creation is successful, notify followers
    const { data: followers, error: followersError } = await supabaseClient
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", userId);

    if (!followersError && followers && followers.length > 0) {
      const streamerName = `${profile.first_name} ${profile.last_name}`.trim();
      
      // Create notifications for all followers
      const notifications = followers.map((follow) => ({
        user_id: follow.follower_id,
        type: "streamer_live",
        title: `${streamerName} is live!`,
        body: `${streamerName} started streaming: ${streamData.title}`,
        created_at: now,
        is_read: false,
        metadata: {
          stream_id: newStream.id,
          streamer_id: userId,
          streamer_name: streamerName,
          stream_title: streamData.title,
          stream_description: streamData.description || "",
          platform: streamData.platform || 'biblenow_video',
          stream_mode: streamData.stream_mode || 'solo',
          livestream_type: streamData.stream_type || 'video',
          action: "stream_started"
        }
      }));

      // Insert notifications
      const { error: notificationError } = await supabaseClient
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Failed to create follower notifications:", notificationError);
      } else {
        console.log(`Sent live notifications to ${followers.length} followers`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Stream created successfully',
        data: newStream,
        followersNotified: followers?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-stream function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 