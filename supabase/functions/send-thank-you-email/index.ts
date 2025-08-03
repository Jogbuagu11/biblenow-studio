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

    // Get the email template
    const { data: emailTemplate, error: templateError } = await supabase
      .from('email_templates')
      .select('html_content')
      .eq('name', 'donation-thank-you')
      .single()

    if (templateError || !emailTemplate) {
      return new Response(
        JSON.stringify({ error: 'Email template not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Replace template variables
    let htmlContent = emailTemplate.html_content
      .replace(/\{\{donor_name\}\}/g, donor_name)
      .replace(/\{\{donation_amount\}\}/g, donation_amount.toString())
      .replace(/\{\{donation_date\}\}/g, donation_date)
      .replace(/\{\{transaction_id\}\}/g, transaction_id)

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
        from: 'BibleNOW <noreply@biblenow.io>',
        to: [donor_email],
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