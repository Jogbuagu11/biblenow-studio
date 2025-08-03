import { render } from '@react-email/components';
import DonationThankYouEmail from './donation_thank_you_email';

interface EmailData {
  donor_name: string;
  donation_amount: number;
  donation_date: string;
  transaction_id: string;
  tax_receipt_url?: string;
}

// Function to send email using Resend API with TSX template
async function sendDonationThankYouEmail(recipientEmail: string, emailData: EmailData) {
  const RESEND_API_KEY = 'your_resend_api_key_here';
  const RESEND_API_URL = 'https://api.resend.com/emails';
  
  // Render the TSX component to HTML
  const htmlContent = render(
    <DonationThankYouEmail
      donor_name={emailData.donor_name}
      donation_amount={emailData.donation_amount}
      donation_date={emailData.donation_date}
      transaction_id={emailData.transaction_id}
      tax_receipt_url={emailData.tax_receipt_url}
    />
  );

  // Prepare the email payload for Resend API
  const emailPayload = {
    from: 'BibleNOW <no-reply@biblenow.io>',
    to: [recipientEmail],
    subject: 'Thank you for your donation to BibleNOW',
    html: htmlContent
  };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Example usage
const emailData: EmailData = {
  donor_name: 'John Doe',
  donation_amount: 50.00,
  donation_date: '2024-01-15',
  transaction_id: 'txn_123456789',
  tax_receipt_url: 'https://example.com/receipt.pdf' // Optional
};

// Send the email
sendDonationThankYouEmail('john.doe@example.com', emailData)
  .then(result => {
    console.log('Email sent successfully!');
  })
  .catch(error => {
    console.error('Error sending email:', error);
  });

// Alternative: Using Resend's React Email integration
// If you're using Resend's React Email integration, you can also do:

import { Resend } from 'resend';

const resend = new Resend('your_resend_api_key_here');

async function sendEmailWithResendReact(emailData: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BibleNOW <no-reply@biblenow.io>',
      to: ['john.doe@example.com'],
      subject: 'Thank you for your donation to BibleNOW',
      react: DonationThankYouEmail({
        donor_name: emailData.donor_name,
        donation_amount: emailData.donation_amount,
        donation_date: emailData.donation_date,
        transaction_id: emailData.transaction_id,
        tax_receipt_url: emailData.tax_receipt_url,
      }),
    });

    if (error) {
      console.error('Error sending email:', error);
      return;
    }

    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}