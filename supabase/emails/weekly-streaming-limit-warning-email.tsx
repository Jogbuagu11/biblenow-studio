import * as React from 'react';
import { Section, Text, Button } from '@react-email/components';
import EmailWrapper from './EmailWrapper';

interface WeeklyStreamingLimitWarningEmailProps {
  firstName: string;
  resetDate: string;
  remainingMinutes: number;
  totalWeeklyMinutes: number;
  supportEmail?: string;
}

const WeeklyStreamingLimitWarningEmail: React.FC<WeeklyStreamingLimitWarningEmailProps> = ({
  firstName = '',
  resetDate = '',
  remainingMinutes = 0,
  totalWeeklyMinutes = 0,
  supportEmail = 'support@biblenow.com',
}) => {
  const usedPercentage = Math.round(((totalWeeklyMinutes - remainingMinutes) / totalWeeklyMinutes) * 100);
  
  return (
    <EmailWrapper previewText="Weekly Streaming Limit Warning - BibleNOW">
      {/* Header */}
      <Section style={{ textAlign: 'center' }}>
        <Text style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px',
          color: '#FFA500',
          padding: '10px'
        }}>
          ⚠️ Weekly Streaming Limit Warning
        </Text>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', marginTop: '20px' }}>
          Hi {firstName},
        </Text>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', marginTop: '20px', maxWidth: '400px', margin: '20px auto' }}>
          You've used <strong>{usedPercentage}%</strong> of your weekly streaming limit on BibleNOW. You have <strong>{remainingMinutes} minutes</strong> remaining this week.
        </Text>
      </Section>

      {/* Usage Progress Bar */}
      <Section style={{ textAlign: 'center', marginTop: '20px' }}>
        <div style={{
          width: '100%',
          maxWidth: '300px',
          margin: '0 auto',
          backgroundColor: '#f0f0f0',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${usedPercentage}%`,
            height: '20px',
            backgroundColor: usedPercentage >= 90 ? '#FF6B6B' : '#FFA500',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
        <Text style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
          {totalWeeklyMinutes - remainingMinutes} / {totalWeeklyMinutes} minutes used
        </Text>
      </Section>

      {/* Reset Information */}
      <Section style={{ textAlign: 'center', marginTop: '20px' }}>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', maxWidth: '400px', margin: '20px auto' }}>
          Your streaming minutes will reset on <strong>{resetDate}</strong>. To continue streaming without limits, consider upgrading to a higher plan.
        </Text>
      </Section>

      {/* Action Buttons */}
      <Section style={{ textAlign: 'center', marginTop: '30px' }}>
        <Button
          href="io.biblenow.authapp://subscription-plans"
          style={{
            backgroundColor: '#D4AF37',
            color: '#000',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 'bold',
            textDecoration: 'none',
            fontSize: '16px',
            display: 'inline-block',
            border: 'none',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Upgrade Plan
        </Button>
        <Button
          href="io.biblenow.authapp://usage-stats"
          style={{
            backgroundColor: '#6B7280',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 'bold',
            textDecoration: 'none',
            fontSize: '16px',
            display: 'inline-block',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          View Usage
        </Button>
      </Section>

      {/* Tips Section */}
      <Section style={{ textAlign: 'center', marginTop: '30px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151', marginBottom: '10px' }}>
          💡 Tips to Manage Your Streaming Time:
        </Text>
        <Text style={{ fontSize: '14px', lineHeight: '1.5', color: '#6B7280', maxWidth: '400px', margin: '10px auto' }}>
          • Plan your streaming sessions in advance<br/>
          • Use the remaining minutes for your most important content<br/>
          • Consider upgrading for unlimited streaming access
        </Text>
      </Section>

      {/* Support Contact */}
      <Section style={{ textAlign: 'center', marginTop: '30px' }}>
        <Text style={{ fontSize: '14px', color: '#6B7280' }}>
          If you have questions or need assistance, contact our support team at{' '}
          <a href={`mailto:${supportEmail}`} style={{ color: '#D4AF37', textDecoration: 'none' }}>{supportEmail}</a>
        </Text>
      </Section>
    </EmailWrapper>
  );
};

export default WeeklyStreamingLimitWarningEmail; 