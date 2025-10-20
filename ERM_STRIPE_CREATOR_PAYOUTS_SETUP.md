# ERM Dashboard - Stripe Creator Payouts Setup

## Overview
Set up Stripe creator payouts functionality in the ERM (Enterprise Resource Management) web React portal to manage creator bonus payments for the BibleNOW Studio platform. This system replaces the old cash-out model with a new donation-based bonus system that calculates bonuses directly from the existing `shekel_gifts` table.

## Database Schema Reference

### Tables Created
1. **`shekel_gifts`** - Existing table that tracks Shekelz donations (already exists)
2. **`creator_payouts`** - Tracks bonus payments to creators  
3. **`verified_profiles`** - Enhanced with payout tracking fields
4. **`migration_mapping`** - Tracks data migration from old system

### Key Fields
```sql
-- shekel_gifts table (existing)
- id (uuid) - Primary key
- sender_id (uuid) - Who made the donation
- recipient_id (uuid) - Who received the donation
- amount (integer) - Amount in Shekelz
- message (text) - Optional message from sender
- is_anonymous (boolean) - Whether sender is anonymous
- gift_type (varchar) - 'donation', 'tip', 'gift'
- context (varchar) - 'livestream', 'course', 'profile'
- context_id (uuid) - ID of the livestream, course, etc.
- status (varchar) - 'pending', 'completed', 'failed', 'refunded'
- created_at (timestamp) - When the gift was created
- tax_amount (integer) - Tax amount (default 0)
- total_amount (integer) - Total amount including tax
- metadata (text) - Additional metadata
- thanked_at (timestamp) - When recipient thanked the sender

-- creator_payouts table
- creator_id (uuid) - Creator receiving payout
- period_start/period_end (date) - Payout period
- total_shekelz (integer) - Total Shekelz in period
- total_usd_gross/net (integer) - USD amounts in cents
- bonus_percentage (decimal) - Default 80.00%
- bonus_amount_usd (integer) - Calculated bonus in cents
- stripe_transfer_id (varchar) - Stripe transfer reference
- status (varchar) - 'pending', 'processing', 'completed', 'failed'

-- verified_profiles additions
- payouts_enabled (boolean) - Whether creator can receive payouts
- last_payout_date (timestamp) - Last payout received
- next_payout_date (timestamp) - Next scheduled payout
- total_payouts_usd (integer) - Lifetime payout total in cents
- payout_frequency (varchar) - 'weekly', 'monthly', 'quarterly'
- minimum_payout_threshold (integer) - Minimum payout in cents (default $10)
```

## ERM Dashboard Requirements

### 1. Creator Management Interface

#### Creator List View
- **Table columns**: Creator Name (first_name + last_name or ministry_name), Ministry Name, Email, Stripe Account Status, Payouts Enabled, Total Payouts, Last Payout Date, Next Payout Date
- **Filters**: Payouts Enabled/Disabled, Stripe Account Connected/Not Connected, Payout Frequency
- **Actions**: Enable/Disable Payouts, View Payout History, Process Manual Payout

#### Creator Detail View
- **Basic Info**: First Name, Last Name, Ministry Name, Email, Stripe account ID
- **Payout Settings**: 
  - Toggle payouts enabled/disabled
  - Set payout frequency (weekly/monthly/quarterly)
  - Set minimum payout threshold (default $10)
- **Statistics**:
  - Total Shekelz received (all-time)
  - Total USD received (all-time)
  - Estimated bonus amount (80% of Shekelz value × $0.10)
  - Lifetime payout total
  - Last payout date and amount

### 2. Payout Processing Interface

#### Payout Queue
- **Pending Payouts**: List of creators eligible for payouts
- **Columns**: Creator, Period, Total Shekelz, Bonus Amount, Status, Actions
- **Filters**: Period, Status, Amount Range
- **Bulk Actions**: Process Selected, Export to CSV

#### Payout Processing
- **Individual Payout**: 
  - Show creator details and period summary
  - Display calculated bonus amount
  - Show Stripe account status
  - Process payout button with confirmation
- **Bulk Processing**:
  - Select multiple creators
  - Preview total payout amounts
  - Process all selected with single action

### 3. Payout History & Analytics

#### Payout History
- **Table**: Creator, Period, Shekelz Amount, Bonus Amount, Status, Processed Date, Stripe Transfer ID
- **Filters**: Date range, Creator, Status, Amount, Gift Type
- **Export**: CSV download for accounting
- **Additional Info**: Show gift context (livestream/course/profile), thank status

#### Analytics Dashboard
- **Metrics**:
  - Total payouts processed (current month/quarter/year)
  - Total bonus amount distributed
  - Average payout per creator
  - Payout success rate
  - Thank rate (percentage of gifts that were thanked)
- **Charts**:
  - Payouts over time (line chart)
  - Top creators by payout amount (bar chart)
  - Payout status distribution (pie chart)
  - Gift types distribution (donation/tip/gift)
  - Context distribution (livestream/course/profile)

### 4. System Configuration

#### Global Settings
- **Bonus Percentage**: Default 80% (configurable)
- **Exchange Rate**: $0.10 per Shekel (fixed)
- **Minimum Payout Threshold**: Default $10.00
- **Payout Processing Schedule**: Automated vs Manual
- **Stripe Configuration**: Test/Live mode toggle

#### Migration Tools
- **Data Migration Status**: Show migration progress from old cash-out system
- **Migration Verification**: Check data integrity
- **Rollback Options**: Emergency rollback procedures

## API Integration Points

### Supabase Edge Functions
```typescript
// Get creator payout summary (fetches from shekel_gifts table)
POST /functions/v1/get-donation-dashboard
{
  "creator_id": "uuid",
  "page": 1,
  "limit": 10
}

// Process creator payout (calculates from shekel_gifts data)
POST /functions/v1/process-creator-payout
{
  "creator_id": "uuid",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "bonus_percentage": 80
}
```

### Express Server Routes
```typescript
// Process bonus payout via Stripe
POST /api/creator-payouts/process-bonus-payout
{
  "payoutId": "uuid"
}

// Get creator payout history
GET /api/creator-payouts/history/:creatorId?page=1&limit=10

// Get creator payout summary
GET /api/creator-payouts/summary/:creatorId
```

## Business Logic

### Bonus Calculation Formula
```typescript
// Data source: shekel_gifts table
const totalShekelz = shekelGifts.reduce((sum, gift) => sum + gift.amount, 0);
const shekelzValueUsd = totalShekelz * 0.10; // $0.10 per Shekel
const bonusAmountUsd = Math.round(shekelzValueUsd * (bonusPercentage / 100)); // Default 80%
```

### Payout Eligibility
- Creator must have `payouts_enabled = true`
- Creator must have connected Stripe account
- Bonus amount must meet minimum threshold
- No pending failed payouts

### Payout Processing Flow
1. Query `shekel_gifts` table for creator's completed gifts in period
2. Calculate total Shekelz and convert to USD ($0.10 per Shekel)
3. Calculate bonus amount (80% of USD value by default)
4. Validate creator eligibility (payouts enabled, Stripe account, minimum threshold)
5. Create payout record in `creator_payouts` table with 'pending' status
6. Process Stripe transfer to creator's connected account
7. Update payout record with transfer ID and 'completed' status
8. Update creator's total payout amount and last payout date in `verified_profiles`

## Security Considerations

### Access Control
- Admin-only access to payout processing
- Creator can only view their own payout history
- Audit trail for all payout actions

### Data Validation
- Validate all monetary amounts
- Sanitize user inputs
- Rate limiting on payout processing

### Error Handling
- Graceful handling of Stripe API failures
- Automatic retry mechanisms
- Comprehensive error logging

## Implementation Priority

### Phase 1: Core Functionality
1. Creator management interface
2. Basic payout processing
3. Payout history view

### Phase 2: Advanced Features
1. Analytics dashboard
2. Bulk processing
3. Automated scheduling

### Phase 3: Optimization
1. Performance improvements
2. Advanced reporting
3. Integration enhancements

## Testing Requirements

### Unit Tests
- Bonus calculation logic
- Payout eligibility validation
- Data transformation functions

### Integration Tests
- Stripe API integration
- Database operations
- End-to-end payout flow

### User Acceptance Tests
- Creator payout processing
- Admin dashboard functionality
- Error handling scenarios

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Supabase Edge Functions deployed
- [ ] Express server routes added
- [ ] ERM dashboard components built
- [ ] Stripe webhook endpoints configured
- [ ] Error monitoring setup
- [ ] Backup procedures established
- [ ] Documentation updated

## Support & Maintenance

### Monitoring
- Payout processing success rates
- Stripe API response times
- Database performance metrics
- Error rates and types

### Maintenance Tasks
- Regular payout processing
- Data cleanup and archiving
- Performance optimization
- Security updates

This setup provides a complete foundation for managing creator payouts in your ERM dashboard while maintaining the new donation-based model for BibleNOW Studio.
