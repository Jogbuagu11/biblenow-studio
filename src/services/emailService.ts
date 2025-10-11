interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.REACT_APP_RESEND_API_KEY || '';
    this.fromEmail = process.env.REACT_APP_FROM_EMAIL || 'noreply@biblenow.com';
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailData.from || this.fromEmail,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email sending failed:', errorData);
        return false;
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendWeeklyStreamingLimitWarning(
    userEmail: string,
    firstName: string,
    resetDate: string,
    remainingMinutes: number,
    totalWeeklyMinutes: number
  ): Promise<boolean> {
    const usedPercentage = Math.round(((totalWeeklyMinutes - remainingMinutes) / totalWeeklyMinutes) * 100);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Streaming Limit Warning - BibleNOW</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background-color: #FFA500; color: white; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .progress-bar { width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; overflow: hidden; margin: 20px 0; }
          .progress-fill { height: 100%; background-color: ${usedPercentage >= 90 ? '#FF6B6B' : '#FFA500'}; transition: width 0.3s ease; }
          .button { display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Weekly Streaming Limit Warning</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>You've used <strong>${usedPercentage}%</strong> of your weekly streaming limit on BibleNOW. You have <strong>${remainingMinutes} minutes</strong> remaining this week.</p>
            
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${usedPercentage}%"></div>
            </div>
            <p style="text-align: center; color: #6B7280; font-size: 14px;">
              ${totalWeeklyMinutes - remainingMinutes} / ${totalWeeklyMinutes} minutes used
            </p>
            
            <p>Your streaming minutes will reset every <strong>Monday at 12:00 AM</strong>. To continue streaming without limits, consider upgrading to a higher plan.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="io.biblenow.authapp://subscription-plans" class="button">Upgrade Plan</a>
              <a href="io.biblenow.authapp://usage-stats" class="button" style="background-color: #6B7280; color: white;">View Usage</a>
            </div>
            
            <h3>💡 Tips to Manage Your Streaming Time:</h3>
            <ul>
              <li>Plan your streaming sessions in advance</li>
              <li>Use the remaining minutes for your most important content</li>
              <li>Consider upgrading for unlimited streaming access</li>
            </ul>
          </div>
          <div class="footer">
            <p>If you have questions or need assistance, contact our support team at <a href="mailto:support@biblenow.com">support@biblenow.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: 'Weekly Streaming Limit Warning - BibleNOW',
      html: html,
    });
  }

  async sendWeeklyStreamingLimitReached(
    userEmail: string,
    firstName: string,
    resetDate: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Streaming Limit Reached - BibleNOW</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background-color: #D4AF37; color: white; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #D4AF37; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ Weekly Streaming Limit Reached</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>You have reached your weekly streaming limit on BibleNOW. Your streaming limits reset every <strong>Monday at 12:00 AM</strong>. You can either wait until the reset, or upgrade to a higher plan for unlimited access.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="io.biblenow.authapp://subscription-plans" class="button">Manage Subscription</a>
            </div>
          </div>
          <div class="footer">
            <p>If you have questions or need assistance, contact our support team at <a href="mailto:support@biblenow.com">support@biblenow.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: 'Weekly Streaming Limit Reached - BibleNOW',
      html: html,
    });
  }
}

export const emailService = new EmailService(); 