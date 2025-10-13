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

interface EmailTemplateProps {
  followerName: string;
  streamerName: string;
  streamTitle: string;
  streamDescription?: string;
  streamUrl: string;
  streamerAvatar?: string;
}

// HTML Email Template Function
function generateEmailTemplate({ followerName, streamerName, streamTitle, streamDescription, streamUrl, streamerAvatar }: EmailTemplateProps): string {
  const avatarHtml = streamerAvatar 
    ? `<img src="${streamerAvatar}" alt="${streamerName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`
    : streamerName.charAt(0).toUpperCase();

  const descriptionHtml = streamDescription 
    ? `<div class="stream-description">"${streamDescription}"</div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${streamerName} is Live on BibleNOW!</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #d97706;
      margin-bottom: 10px;
    }
    .streamer-info {
      display: flex;
      align-items: center;
      margin-bottom: 25px;
      padding: 20px;
      background: #fef3c7;
      border-radius: 8px;
      border-left: 4px solid #d97706;
    }
    .avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      margin-right: 15px;
      background: #d97706;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    }
    .streamer-details h2 {
      margin: 0 0 5px 0;
      color: #1f2937;
      font-size: 20px;
    }
    .streamer-details p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
    .stream-title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 15px;
      text-align: center;
    }
    .stream-description {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      color: #4b5563;
      font-style: italic;
    }
    .cta-button {
      display: inline-block;
      background: #d97706;
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
      text-align: center;
      margin: 20px 0;
      transition: background-color 0.3s;
    }
    .cta-button:hover {
      background: #b45309;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .unsubscribe {
      margin-top: 20px;
      font-size: 12px;
      color: #9ca3af;
    }
    .unsubscribe a {
      color: #6b7280;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📖 BibleNOW Studio</div>
      <p style="margin: 0; color: #6b7280;">Your spiritual streaming platform</p>
    </div>

    <h1 style="text-align: center; color: #1f2937; margin-bottom: 30px;">
      Hello ${followerName}! 👋
    </h1>

    <div class="streamer-info">
      <div class="avatar">
        ${avatarHtml}
      </div>
      <div class="streamer-details">
        <h2>${streamerName} is now live!</h2>
        <p>Join the spiritual journey</p>
      </div>
    </div>

    <div class="stream-title">${streamTitle}</div>

    ${descriptionHtml}

    <div style="text-align: center;">
      <a href="${streamUrl}" class="cta-button">
        🎥 Join Live Stream
      </a>
    </div>

    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-top: 30px;">
      <h3 style="margin: 0 0 10px 0; color: #1e40af;">What to expect:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
        <li>Interactive Bible study session</li>
        <li>Live chat with other viewers</li>
        <li>Spiritual guidance and community</li>
        <li>Prayer requests and support</li>
      </ul>
    </div>

    <div class="footer">
      <p>This email was sent because you follow ${streamerName} on BibleNOW Studio.</p>
      <p>Don't miss out on this spiritual journey!</p>
      
      <div class="unsubscribe">
        <p>You can manage your email preferences in your <a href="https://biblenow.io/settings">account settings</a>.</p>
        <p>© 2025 BibleNOW Studio. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🚀 [CREATE-STREAM] Function started');
  console.log('📝 [CREATE-STREAM] Request method:', req.method);
  console.log('📝 [CREATE-STREAM] Request headers:', Object.fromEntries(req.headers.entries()));

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
    
    console.log('📊 [CREATE-STREAM] Request data received:');
    console.log('👤 [CREATE-STREAM] User ID:', userId);
    console.log('📺 [CREATE-STREAM] Stream data:', JSON.stringify(streamData, null, 2));

    if (!userId || !streamData) {
      console.error('❌ [CREATE-STREAM] Missing required data - userId or streamData');
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
    console.log('🔍 [CREATE-STREAM] Fetching user profile for:', userId);
    const { data: profile, error: profileError } = await supabaseClient
      .from('verified_profiles')
      .select('id, first_name, last_name, avatar_url, profile_photo_url')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('❌ [CREATE-STREAM] Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found or not verified' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('✅ [CREATE-STREAM] User profile found:', {
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`,
      avatar: profile.avatar_url || profile.profile_photo_url
    });

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

      // Send email notifications to followers with TSX template
      console.log('📧 [CREATE-STREAM] Starting email notification process...');
      try {
        const streamUrl = `https://biblenow.io/live-stream?room=${encodeURIComponent(newStream.room_name || '')}&title=${encodeURIComponent(streamData.title)}`;
        const streamerName = `${profile.first_name} ${profile.last_name}`.trim();
        const streamerAvatar = profile.avatar_url || profile.profile_photo_url;
        
        console.log('📧 [CREATE-STREAM] Email data prepared:', {
          streamUrl,
          streamerName,
          streamerAvatar: streamerAvatar ? 'Available' : 'Not available',
          followerCount: followers.length
        });

        // Get followers with their email preferences
        const { data: followersWithEmails, error: followersEmailError } = await supabaseClient
          .from('user_follows')
          .select(`
            follower_id,
            verified_profiles!user_follows_follower_id_fkey (
              id, first_name, last_name, email, email_preferences
            )
          `)
          .eq('following_id', userId);

        if (followersEmailError) {
          console.error('❌ [CREATE-STREAM] Error fetching followers with emails:', followersEmailError);
          throw followersEmailError;
        }

        console.log('📧 [CREATE-STREAM] Found followers with email data:', followersWithEmails?.length || 0);

        let emailsSent = 0;
        const emailErrors: string[] = [];

        // Send emails to each follower
        for (const follow of followersWithEmails || []) {
          const follower = follow.verified_profiles;
          if (!follower || !follower.email) {
            console.log('⚠️ [CREATE-STREAM] Skipping follower without email:', follower?.id);
            continue;
          }

          // Check email preferences
          const preferences = follower.email_preferences || {};
          const notificationsEnabled = preferences.livestreamNotifications !== false; // Default to true
          
          if (!notificationsEnabled) {
            console.log('⚠️ [CREATE-STREAM] Skipping follower with disabled notifications:', follower.email);
            continue;
          }

          try {
            // Generate HTML email template
            const emailHtml = generateEmailTemplate({
              followerName: follower.first_name || 'Friend',
              streamerName,
              streamTitle: streamData.title,
              streamDescription: streamData.description,
              streamUrl,
              streamerAvatar
            });

            console.log('📧 [CREATE-STREAM] Sending email to:', follower.email);

            // Send email via Resend
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'BibleNOW Studio <no-reply@biblenow.io>',
                to: [follower.email],
                subject: `${streamerName} is Live on BibleNOW!`,
                html: emailHtml,
              }),
            });

            if (emailResponse.ok) {
              const emailResult = await emailResponse.json();
              console.log('✅ [CREATE-STREAM] Email sent successfully to:', follower.email, 'ID:', emailResult.id);
              emailsSent++;
            } else {
              const errorText = await emailResponse.text();
              console.error('❌ [CREATE-STREAM] Email failed for:', follower.email, 'Error:', errorText);
              emailErrors.push(`${follower.email}: ${errorText}`);
            }
          } catch (emailError) {
            console.error('❌ [CREATE-STREAM] Email error for:', follower.email, 'Error:', emailError);
            emailErrors.push(`${follower.email}: ${emailError.message}`);
          }
        }

        // Log email notification results
        console.log('📧 [CREATE-STREAM] Email notification summary:', {
          totalFollowers: followers.length,
          emailsSent,
          errors: emailErrors.length,
          errorDetails: emailErrors
        });

        // Log email notifications in database
        if (emailsSent > 0) {
          const emailNotifications = followersWithEmails?.slice(0, emailsSent).map((follow) => ({
            user_id: follow.follower_id,
            type: 'livestream_notification_email',
            title: `${streamerName} is Live!`,
            body: `Email notification sent for: ${streamData.title}`,
            metadata: {
              stream_id: newStream.id,
              streamer_id: userId,
              streamer_name: streamerName,
              stream_title: streamData.title,
              email_sent: true,
              timestamp: new Date().toISOString()
            }
          })) || [];

          const { error: logError } = await supabaseClient
            .from('studio_notifications')
            .insert(emailNotifications);

          if (logError) {
            console.error('❌ [CREATE-STREAM] Failed to log email notifications:', logError);
          } else {
            console.log('✅ [CREATE-STREAM] Email notifications logged in database');
          }
        }

      } catch (emailError) {
        console.error('❌ [CREATE-STREAM] Email notification process failed:', emailError);
        // Don't fail the stream creation if email notifications fail
      }
    }

    console.log('✅ [CREATE-STREAM] Stream created successfully:', {
      streamId: newStream.id,
      title: newStream.title,
      followersNotified: followers?.length || 0,
      roomName: newStream.room_name
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Stream created successfully',
        data: newStream,
        followersNotified: followers?.length || 0,
        debug: {
          streamerName: `${profile.first_name} ${profile.last_name}`,
          roomName: newStream.room_name,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [CREATE-STREAM] Function error:', error);
    console.error('❌ [CREATE-STREAM] Error stack:', error.stack);
    console.error('❌ [CREATE-STREAM] Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        debug: {
          message: error.message,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 