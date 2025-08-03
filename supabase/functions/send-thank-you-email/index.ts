import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// React Email template converted to HTML
function generateThankYouEmail(donorName: string, donationAmount: number, donationDate: string, transactionId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for your donation to BibleNOW</title>
</head>
<body style="background-color: #f9f9f9; font-family: sans-serif; margin: 0; padding: 20px;">
  <div style="background-color: #ffffff; padding: 20px; max-width: 520px; margin: 0 auto; border-radius: 8px;">
    <!-- BibleNOW Logo -->
    <div style="text-align: center; padding-bottom: 10px;">
      <img src="https://jhlawjmyorpmafokxtuh.supabase.co/storage/v1/object/public/assets//bbn.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iMzUwZGQ1ZS03NjA1LTQ0ZGQtOTA4NC00NjEzZWJlN2JmOTkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhc3NldHMvQmlibGUgTlc1MDAucG5nIiwiaWF0IjoxNzQ5MzIwMTg1LCJleHAiOjE3ODA4NTYxODV9.Hh4W3crg_6shE4TW1OJxpoLnd75WAeflrT5n6aLMaQY" width="80" alt="BibleNOW Logo" style="margin: 0 auto;">
    </div>

    <!-- Greeting -->
    <div>
      <p style="font-size: 20px; font-weight: bold; text-align: left; margin-bottom: 0;">
        Dear ${donorName},
      </p>
      <p style="font-size: 16px; line-height: 1.5; margin-top: 20px;">
        Thank you for your generous donation to BibleNOW. Your support helps us continue our mission of making scripture accessible to everyone.
      </p>
    </div>

    <!-- Donation Details -->
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
      <p style="font-size: 16px; margin: 6px 0;">
        <strong>Amount:</strong> ${donationAmount} Shekelz
      </p>
      <p style="font-size: 16px; margin: 6px 0;">
        <strong>Date:</strong> ${donationDate}
      </p>
      <p style="font-size: 16px; margin: 6px 0;">
        <strong>Transaction ID:</strong> ${transactionId}
      </p>
    </div>

    <hr style="border-color: #e0e0e0; margin: 30px 0;">

    <!-- Impact Message -->
    <div>
      <p style="font-size: 16px; line-height: 1.5; text-align: center;">
        Your donation helps us spread God's word and build our community. We're grateful for your support in making this possible.
      </p>
    </div>

    <!-- Support Contact -->
    <div style="text-align: center; margin-top: 30px;">
      <p>
        Got a question? Contact us at <a href="mailto:support@biblenow.io" style="color: #007bff;">support@biblenow.io</a> or call <a href="tel:+4179224253" style="color: #007bff;">+417-922-4253</a>.
      </p>
    </div>

    <!-- Social Icons -->
    <div style="text-align: center; margin-top: 30px;">
      <a href="https://facebook.com/biblenow.io" style="display: inline-block; margin: 0 10px;">
        <img src="https://fjcctio.stripocdn.email/content/assets/img/social-icons/logo-black/facebook-logo-black.png" width="32" alt="Facebook">
      </a>
      <a href="https://x.com/biblenowio" style="display: inline-block; margin: 0 10px;">
        <img src="https://fjcctio.stripocdn.email/content/assets/img/social-icons/logo-black/x-logo-black.png" width="32" alt="X">
      </a>
      <a href="https://instagram.com/biblenow.io" style="display: inline-block; margin: 0 10px;">
        <img src="https://fjcctio.stripocdn.email/content/assets/img/social-icons/logo-black/instagram-logo-black.png" width="32" alt="Instagram">
      </a>
      <a href="https://www.youtube.com/channel/UCsHHy4aSdzRnbAj1P7ffmbw" style="display: inline-block; margin: 0 10px;">
        <img src="https://fjcctio.stripocdn.email/content/assets/img/social-icons/logo-black/youtube-logo-black.png" width="32" alt="YouTube">
      </a>
    </div>

    <!-- Footer -->
    <p style="font-size: 12px; text-align: center; margin-top: 20px; color: #999;">
      &copy; ${new Date().getFullYear()} BibleNOW. All rights reserved.
    </p>
  </div>
</body>
</html>`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { gift_id, donor_email, donor_name, donation_amount, donation_date, transaction_id } = await req.json()

    if (!gift_id || !donor_email || !donor_name || !donation_amount || !donation_date || !transaction_id) {
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

    // Generate email HTML
    const htmlContent = generateThankYouEmail(donor_name, donation_amount, donation_date, transaction_id)

    // Send email via Resend
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

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BibleNOW <no-reply@biblenow.io>',
        to: donor_email,
        subject: 'Thank you for your donation to BibleNOW',
        html: htmlContent,
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      console.error('Resend API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Mark the gift as thanked in the database
    const { error: updateError } = await supabase
      .from('shekel_gifts')
      .update({ thanked_at: new Date().toISOString() })
      .eq('id', gift_id)

    if (updateError) {
      console.error('Error updating gift thanked status:', updateError)
      // Don't fail the request if this fails, email was still sent
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Thank you email sent successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-thank-you-email:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 