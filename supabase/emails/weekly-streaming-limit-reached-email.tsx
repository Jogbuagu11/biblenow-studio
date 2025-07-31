import * as React from 'react';
import { Section, Text, Button } from '@react-email/components';
import EmailWrapper from './EmailWrapper';

interface WeeklyStreamingLimitReachedEmailProps {
  firstName: string;
  resetDate: string;
  supportEmail?: string;
}

const WeeklyStreamingLimitReachedEmail: React.FC<WeeklyStreamingLimitReachedEmailProps> = ({
  firstName = '',
  resetDate = '',
  supportEmail = 'support@biblenow.com',
}) => {
  return (
    <EmailWrapper previewText="Weekly Streaming Limit Reached - BibleNOW">
      {/* Header */}
      <Section style={{ textAlign: 'center' }}>
        <Text style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px',
          color: '#D4AF37',
          padding: '10px'
        }}>
          ⏳ Weekly Streaming Limit Reached
        </Text>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', marginTop: '20px' }}>
          Hi {firstName},
        </Text>
        <Text style={{ fontSize: '16px', lineHeight: '1.5', marginTop: '20px', maxWidth: '400px', margin: '20px auto' }}>
          You have reached your weekly streaming limit on BibleNOW. You can either wait until your minutes reset on <strong>{resetDate}</strong>, or upgrade to a higher plan for unlimited access.
        </Text>
      </Section>

      {/* Upgrade Option */}
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
            cursor: 'pointer'
          }}
        >
          Manage Subscription
        </Button>
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

export default WeeklyStreamingLimitReachedEmail; 