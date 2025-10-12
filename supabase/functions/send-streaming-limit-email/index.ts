import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateEmailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BibleNOW Studio</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #ffffff;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
    }
    .logo {
      width: 120px;
      height: auto;
    }
    .content {
      background-color: #ffffff;
      padding: 30px;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #D4AF37;
      color: #000000;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 10px 5px;
    }
    .divider {
      height: 1px;
      background-color: #eaeaea;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/public/assets/bbn.png" alt="BibleNOW Logo" class="logo">
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <div class="divider"></div>
      <p>BibleNOW Studio</p>
      <p>If you have questions or need assistance, contact our support team at <a href="mailto:support@biblenow.com">support@biblenow.com</a></p>
      <p style="color: #999; font-size: 12px;">
        This is an automated message, please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>`
}

function generateLimitWarningContent(firstName: string, usagePercentage: number, remainingMinutes: number, resetDate: string): string {
  return `
    <h1 style="color: #D4AF37; margin-bottom: 20px;">⚠️ Weekly Streaming Limit Warning</h1>
    <h2>Hi ${firstName},</h2>
    <p>You have used <strong>${usagePercentage}%</strong> of your weekly streaming limit in BibleNOW Studio.</p>
    <p>You have <strong>${remainingMinutes} minutes</strong> remaining for this week.</p>
    <p>Your streaming minutes will reset on <strong>${resetDate}</strong>.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studio.biblenow.io/settings" class="button">Manage Subscription</a>
    </div>
  `
}

function generateLimitReachedContent(firstName: string, resetDate: string): string {
  return `
    <h1 style="color: #D4AF37; margin-bottom: 20px;">🚫 Weekly Streaming Limit Reached</h1>
    <h2>Hi ${firstName},</h2>
    <p>You have reached your weekly streaming limit in BibleNOW Studio.</p>
    <p>You cannot start new streams until your limit resets on <strong>${resetDate}</strong>.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://studio.biblenow.io/settings" class="button">Upgrade Plan</a>
    </div>
  `
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 [send-streaming-limit-email] Function called');
    
    const { 
      user_id, 
      type,
      usage_percentage,
      remaining_minutes,
      reset_date 
    } = await req.json()

    console.log('📧 [send-streaming-limit-email] Request data:', {
      user_id,
      type,
      usage_percentage,
      remaining_minutes,
      reset_date
    });

    if (!user_id || !type) {
      console.error('❌ [send-streaming-limit-email] Missing required fields: user_id and type are required');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id and type are required' }),
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

    // Fetch user profile data from database
    console.log('📧 [send-streaming-limit-email] Fetching user profile...');
    const { data: userProfile, error: profileError } = await supabase
      .from('verified_profiles')
      .select('email, first_name, preferences')
      .eq('id', user_id)
      .single()

    if (profileError || !userProfile) {
      console.error('❌ [send-streaming-limit-email] User profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check email preferences
    const preferences = userProfile.preferences || {};
    const shouldSendEmails = preferences.streamingLimitEmails !== false;

    if (!shouldSendEmails) {
      console.log('⚠️ [send-streaming-limit-email] User has disabled streaming limit emails');
      return new Response(
        JSON.stringify({ success: true, message: 'Email sending disabled by user preference' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const email = userProfile.email;
    const first_name = userProfile.first_name || 'User';

    console.log('📧 [send-streaming-limit-email] User profile fetched:', {
      email,
      first_name,
      shouldSendEmails
    });

    // Generate email content based on type
    const emailContent = type === 'warning' 
      ? generateLimitWarningContent(first_name, usage_percentage, remaining_minutes, reset_date)
      : generateLimitReachedContent(first_name, reset_date)

    // Wrap the content in the standard email template
    const htmlContent = generateEmailWrapper(emailContent)

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('❌ [send-streaming-limit-email] Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('📧 [send-streaming-limit-email] Sending email via Resend...');
    
    const emailPayload = {
      from: 'BibleNOW Studio <no-reply@biblenow.io>',
      to: email,
      subject: type === 'warning' 
        ? '⚠️ Weekly Streaming Limit Warning - BibleNOW Studio'
        : '🚫 Weekly Streaming Limit Reached - BibleNOW Studio',
      html: htmlContent,
    };

    console.log('📧 [send-streaming-limit-email] Email payload:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      htmlLength: emailPayload.html.length
    });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    console.log('📧 [send-streaming-limit-email] Resend response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('❌ [send-streaming-limit-email] Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const emailResult = await emailResponse.json();
    console.log('✅ [send-streaming-limit-email] Email sent successfully:', emailResult);

    // Log the email sent (only if user_id is a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValidUUID = uuidRegex.test(user_id);
    
    if (isValidUUID) {
      console.log('📧 [send-streaming-limit-email] Logging email notification...');
      
      // First check if the user exists in verified_profiles to avoid foreign key constraint errors
      const { data: userExists, error: userCheckError } = await supabase
        .from('verified_profiles')
        .select('id')
        .eq('id', user_id)
        .single()

      if (userCheckError || !userExists) {
        console.log('⚠️ [send-streaming-limit-email] Skipping database logging - user not found in verified_profiles:', user_id);
      } else {
        const { error: logError } = await supabase
          .from('studio_notifications')
          .insert({
            user_id,
            type: type === 'warning' ? 'streaming_limit_warning_email' : 'streaming_limit_reached_email',
            title: type === 'warning' ? 'Streaming Limit Warning Email Sent' : 'Streaming Limit Reached Email Sent',
            body: type === 'warning' 
              ? `Sent warning email for ${usage_percentage}% usage` 
              : 'Sent limit reached notification email',
            metadata: {
              email_sent: true,
              email_type: type,
              usage_percentage,
              remaining_minutes,
              reset_date,
              email_result: emailResult
            }
          })

        if (logError) {
          console.error('❌ [send-streaming-limit-email] Error logging email notification:', logError)
          // Don't fail the request if logging fails
        } else {
          console.log('✅ [send-streaming-limit-email] Email notification logged successfully');
        }
      }
    } else {
      console.log('⚠️ [send-streaming-limit-email] Skipping database logging - user_id is not a valid UUID:', user_id);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Streaming limit email sent successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 [send-streaming-limit-email] Unexpected error:', error)
    console.error('💥 [send-streaming-limit-email] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})