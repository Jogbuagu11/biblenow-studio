# Express Onboarding Setup Guide

## Overview

This guide explains how the Express onboarding flow works in your BibleNow Studio platform, allowing verified users to easily set up their Stripe accounts to receive donations.

## How Express Onboarding Works

### **1. User Flow**
```
User clicks "Set Up Stripe Account"
    ↓
Platform creates Express account
    ↓
User redirected to Stripe onboarding
    ↓
User completes business information
    ↓
User returns to platform
    ↓
Account status updated via webhooks
```

### **2. Express Account Creation**

#### **Frontend (Payments.tsx)**
```typescript
const handleCreateExpressAccount = async () => {
  const result = await stripeService.createExpressAccount(user.uid);
  if (result.success && result.onboardingUrl) {
    window.location.href = result.onboardingUrl;
  }
};
```

#### **Backend (server/index.js)**
```typescript
app.post('/api/stripe/create-express-account', async (req, res) => {
  // 1. Create Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email: userProfile.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    business_profile: {
      url: 'https://studio.biblenow.io',
      mcc: '5734', // Computer Software Stores
    },
  });

  // 2. Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${FRONTEND_URL}/payments?error=refresh`,
    return_url: `${FRONTEND_URL}/payments?success=true`,
    type: 'account_onboarding',
  });

  // 3. Update user profile
  await supabase
    .from('verified_profiles')
    .update({ stripe_account_id: account.id })
    .eq('id', userId);
});
```

## Express Account Features

### **What Users Get:**
- ✅ **Quick Setup**: 5-10 minutes to complete
- ✅ **Stripe Dashboard**: Limited but functional
- ✅ **Direct Payouts**: Money goes to their bank account
- ✅ **Automatic Compliance**: Stripe handles most requirements
- ✅ **Mobile Friendly**: Works on all devices

### **What Users Don't Get:**
- ❌ **Full API Access**: Can't integrate custom features
- ❌ **Custom Branding**: Stripe branding only
- ❌ **Advanced Features**: Limited dashboard functionality

## Onboarding Requirements

### **Business Information:**
- **Legal Name**: Individual or business name
- **Address**: Physical business address
- **Tax ID**: SSN for individuals, EIN for businesses
- **Phone Number**: Contact information

### **Bank Account:**
- **Account Number**: For receiving payouts
- **Routing Number**: Bank identification
- **Account Type**: Checking or savings

### **Identity Verification:**
- **Government ID**: Driver's license or passport
- **Proof of Address**: Utility bill or bank statement
- **Business Documents**: If applicable

## Account Status Tracking

### **Status States:**
```typescript
interface StripeAccount {
  id: string;
  detailsSubmitted: boolean;    // Onboarding completed
  chargesEnabled: boolean;      // Can accept payments
  payoutsEnabled: boolean;      // Can receive payouts
  businessProfile?: {
    name?: string;
    url?: string;
    supportEmail?: string;
  };
}
```

### **Status Flow:**
1. **Account Created**: `detailsSubmitted: false`
2. **Onboarding Started**: User fills out information
3. **Details Submitted**: `detailsSubmitted: true`
4. **Under Review**: Stripe verifies information
5. **Charges Enabled**: `chargesEnabled: true`
6. **Payouts Enabled**: `payoutsEnabled: true`

## Webhook Events

### **Account Updates:**
```typescript
case 'account.updated':
  // Account information changed
  await updateAccountStatus(account.id, {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });
  break;

case 'account.application.authorized':
  // Express account fully authorized
  await updateAccountStatus(authorizedAccount.id, {
    chargesEnabled: authorizedAccount.charges_enabled,
    payoutsEnabled: authorizedAccount.payouts_enabled,
    detailsSubmitted: authorizedAccount.details_submitted,
  });
  break;
```

## Error Handling

### **Common Issues:**

#### **1. Onboarding Incomplete**
```typescript
if (!stripeAccount.detailsSubmitted) {
  return (
    <Alert>
      <AlertTitle>Account setup incomplete</AlertTitle>
      <AlertDescription>
        Please complete your Stripe account setup to receive payments.
      </AlertDescription>
    </Alert>
  );
}
```

#### **2. Verification Pending**
```typescript
if (!stripeAccount.chargesEnabled) {
  return (
    <Alert>
      <AlertTitle>Verification in progress</AlertTitle>
      <AlertDescription>
        Your account information is being reviewed. This may take 1-2 business days.
      </AlertDescription>
    </Alert>
  );
}
```

#### **3. Onboarding Refresh**
```typescript
// Handle refresh from Stripe
if (searchParams.get('error') === 'refresh') {
  toast({
    title: "Onboarding Expired",
    description: "Please try setting up your account again.",
    variant: "destructive",
  });
}
```

## Security & Compliance

### **Data Protection:**
- ✅ **PCI Compliance**: Handled by Stripe
- ✅ **Data Encryption**: All data encrypted in transit
- ✅ **Access Control**: Users only see their own data
- ✅ **Audit Trail**: All actions logged

### **Verification Process:**
1. **Identity Check**: Government ID verification
2. **Address Verification**: Proof of residence
3. **Business Verification**: Business documents if applicable
4. **Bank Verification**: Micro-deposits or instant verification

## Testing Express Onboarding

### **Test Mode Setup:**
```bash
# Use test keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Test account creation
curl -X POST http://localhost:3001/api/stripe/create-express-account \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id"}'
```

### **Test Onboarding Flow:**
1. Create test Express account
2. Complete onboarding with test data
3. Verify account status updates
4. Test payment processing
5. Test payout functionality

## Production Considerations

### **Environment Variables:**
```bash
# Required for production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
FRONTEND_URL=https://studio.biblenow.io
STRIPE_WEBHOOK_SECRET=whsec_...
```

### **Webhook Configuration:**
- **Endpoint**: `https://your-server.com/api/stripe/webhook`
- **Events**: `account.updated`, `account.application.authorized`
- **Security**: Verify webhook signatures

### **Monitoring:**
```typescript
// Monitor onboarding success rates
const onboardingMetrics = {
  accountsCreated: 0,
  onboardingCompleted: 0,
  verificationPassed: 0,
  paymentsEnabled: 0,
};
```

## Troubleshooting

### **Common Issues:**

#### **1. Account Creation Fails**
- Check Stripe API key permissions
- Verify user profile exists
- Check network connectivity

#### **2. Onboarding Link Expires**
- Links expire after 24 hours
- User needs to start over
- Implement refresh handling

#### **3. Verification Fails**
- Common with new businesses
- Provide clear error messages
- Offer support contact

#### **4. Webhook Not Received**
- Check webhook endpoint URL
- Verify webhook secret
- Test with Stripe CLI

## Best Practices

### **User Experience:**
1. **Clear Instructions**: Explain what information is needed
2. **Progress Indicators**: Show onboarding status
3. **Error Messages**: Helpful, actionable feedback
4. **Support Options**: Contact information for help

### **Technical:**
1. **Error Handling**: Graceful failure recovery
2. **Status Updates**: Real-time account status
3. **Security**: Verify all webhook signatures
4. **Monitoring**: Track success/failure rates

### **Compliance:**
1. **Data Retention**: Follow Stripe's requirements
2. **Privacy Policy**: Explain data usage
3. **Terms of Service**: Platform rules
4. **Support**: Help users with issues

## Summary

Express onboarding provides a **user-friendly, secure, and compliant** way for verified users to set up their Stripe accounts. The flow handles all the complexity while providing a smooth experience for your platform users.

**Key Benefits:**
- ✅ **Quick Setup**: 5-10 minutes
- ✅ **Automatic Compliance**: Stripe handles verification
- ✅ **Secure**: PCI compliant
- ✅ **User-Friendly**: Guided process
- ✅ **Scalable**: Works for any number of users

Your implementation follows Stripe's best practices and provides a professional onboarding experience for your Bible streaming platform! 