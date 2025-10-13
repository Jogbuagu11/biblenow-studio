import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateLivestreamNotificationEmail(
  followerName: string, 
  streamerName: string, 
  streamTitle: string, 
  streamUrl: string,
  streamDescription?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${streamerName} is Live on BibleNOW!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
            🔴 ${streamerName} is Live!
          </h1>
          <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 16px;">
            Join the spiritual journey on BibleNOW
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">
            ${streamTitle}
          </h2>
          
          ${streamDescription ? `
          <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
            ${streamDescription}
          </p>
          ` : ''}
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 500;">
              💡 <strong>Tip:</strong> Click the button below to join the livestream and connect with ${streamerName} and other viewers.
            </p>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${streamUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
              🎥 Join Livestream
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 32px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; text-align: center;">
              This notification was sent because you follow ${streamerName} on BibleNOW Studio.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
            <strong>BibleNOW Studio</strong> - Connecting hearts through faith
          </p>
          <p style="color: #9ca3af; margin: 0; font-size: 12px;">
            © 2025 BibleNOW. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      streamer_id, 
      stream_id, 
      stream_title, 
      stream_description,
      stream_url 
    } = await req.json()

    if (!streamer_id || !stream_id || !stream_title || !stream_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get streamer information
    const { data: streamer, error: streamerError } = await supabase
      .from('verified_profiles')
      .select('id, first_name, last_name, email')
      .eq('id', streamer_id)
      .single()

    if (streamerError || !streamer) {
      console.error('Error fetching streamer:', streamerError)
      return new Response(
        JSON.stringify({ error: 'Streamer not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const streamerName = `${streamer.first_name} ${streamer.last_name}`.trim()

    // Get all followers of the streamer
    const { data: followers, error: followersError } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        verified_profiles!user_follows_follower_id_fkey (
          id,
          first_name,
          last_name,
          email,
          email_preferences
        )
      `)
      .eq('following_id', streamer_id)

    if (followersError) {
      console.error('Error fetching followers:', followersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch followers' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No followers to notify',
          notifications_sent: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let notificationsSent = 0
    const errors: string[] = []

    // Send email to each follower
    for (const follow of followers) {
      const follower = follow.verified_profiles
      if (!follower || !follower.email) continue

      // Check if follower has email notifications enabled
      const emailPrefs = follower.email_preferences as any
      if (emailPrefs && emailPrefs.livestreamNotifications === false) {
        console.log(`Skipping notification for ${follower.email} - notifications disabled`)
        continue
      }

      const followerName = `${follower.first_name} ${follower.last_name}`.trim() || 'Friend'
      
      try {
        const emailContent = generateLivestreamNotificationEmail(
          followerName,
          streamerName,
          stream_title,
          stream_url,
          stream_description
        )

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'BibleNOW Studio <no-reply@biblenow.io>',
            to: follower.email,
            subject: `🔴 ${streamerName} is Live: ${stream_title}`,
            html: emailContent,
          }),
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.text()
          console.error(`Failed to send email to ${follower.email}:`, errorData)
          errors.push(`Failed to send to ${follower.email}`)
          continue
        }

        notificationsSent++

        // Log the notification in the database
        await supabase
          .from('studio_notifications')
          .insert({
            user_id: follower.id,
            type: 'livestream_notification_email',
            title: 'Livestream Notification Sent',
            body: `Sent livestream notification for ${streamerName}'s stream: ${stream_title}`,
            metadata: {
              streamer_id,
              stream_id,
              stream_title,
              email_sent: true,
              notification_type: 'livestream_start'
            }
          })

      } catch (error) {
        console.error(`Error sending email to ${follower.email}:`, error)
        errors.push(`Error sending to ${follower.email}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Livestream notifications processed',
        notifications_sent: notificationsSent,
        total_followers: followers.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-livestream-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
