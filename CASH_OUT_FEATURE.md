# Cash Out Feature for Verified Users

## Overview

The Cash Out feature allows verified users to redeem their Shekelz for cash using Stripe transfers. This feature is only available to verified users who have connected their Stripe accounts.

## Features

### Eligibility Requirements
- User must be a verified user (exists in `verified_profiles` with `ministry_name`)
- User must have a connected Stripe account (`stripe_account_id` in `verified_profiles`)
- Minimum cash out amount: 2,000 Shekelz ($20)
- Maximum cash out amount: 100,000 Shekelz ($1,000)
- User must have sufficient balance

### Exchange Rate
- 1 Shekel = $0.01
- 100 Shekelz = $1.00
- 2,000 Shekelz = $20.00

### Cash Out Process
1. User selects amount using slider (minimum $20, maximum $1,000)
2. System validates eligibility and balance
3. Cash out request is created in `cash_out_requests` table
4. User's Shekel balance is deducted immediately
5. Stripe transfer is initiated to user's connected account
6. Request status is updated based on transfer result

### Status Tracking
- **Pending**: Request created, waiting for Stripe processing
- **Processing**: Stripe transfer initiated
- **Completed**: Transfer successful, payment received
- **Failed**: Transfer failed, balance restored

## Database Schema

### cash_out_requests Table
```sql
CREATE TABLE cash_out_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES verified_profiles(id),
  amount integer NOT NULL, -- Amount in Shekelz
  cash_amount integer NOT NULL, -- Amount in USD cents
  status varchar(20) NOT NULL DEFAULT 'pending',
  stripe_transfer_id varchar(255),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  processed_at timestamp,
  error_message text
);
```

## API Endpoints

### POST /api/stripe/process-cash-out
Processes a cash out request via Stripe transfer.

**Request Body:**
```json
{
  "userId": "user-uuid",
  "amount": 2000, // Amount in cents
  "requestId": "cash-out-request-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "transferId": "tr_1234567890",
  "amount": 2000
}
```

## UI Components

### CashOutWidget
- Amount slider with real-time USD conversion
- Eligibility checking and error display
- Processing state management
- Success/error feedback

### Cash Out History Tab
- Table view of all cash out requests
- Status badges (Pending, Processing, Completed, Failed)
- Amount and date information
- Error message display for failed requests

## Security Features

### Row Level Security (RLS)
- Users can only view their own cash out requests
- Users can only create requests for themselves
- System updates are restricted to service role

### Validation
- Minimum/maximum amount checks
- Balance validation
- Stripe account verification
- Transaction rollback on failure

## Error Handling

### Common Error Scenarios
1. **Insufficient Balance**: User tries to cash out more than available
2. **No Stripe Account**: User hasn't connected Stripe account
3. **Not Verified**: Regular users cannot cash out
4. **Stripe Transfer Failed**: Network or Stripe API issues
5. **Below Minimum**: Amount less than $20

### Rollback Mechanism
- If Stripe transfer fails, user's balance is restored
- Failed requests are marked with error messages
- System maintains data consistency

## Testing

### Manual Testing Steps
1. Verify user is eligible (verified + Stripe connected)
2. Test minimum amount validation ($20)
3. Test maximum amount validation ($1,000)
4. Test insufficient balance scenario
5. Test successful cash out flow
6. Verify balance deduction and restoration
7. Check cash out history display

### Database Verification
```sql
-- Check cash out requests
SELECT * FROM cash_out_requests WHERE user_id = 'user-uuid';

-- Verify balance updates
SELECT shekel_balance FROM verified_profiles WHERE id = 'user-uuid';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'cash_out_requests';
```

## Deployment Notes

### Required Environment Variables
- `STRIPE_SECRET_KEY`: For processing transfers
- `SUPABASE_SERVICE_ROLE_KEY`: For database operations

### Database Migration
Run the migration script to create the `cash_out_requests` table:
```bash
psql -d your_database -f scripts/apply_cash_out_migration.sql
```

### Server Deployment
Ensure the server has the new `/api/stripe/process-cash-out` endpoint deployed.

## Future Enhancements

### Potential Improvements
1. **Webhook Integration**: Automatic status updates from Stripe
2. **Batch Processing**: Multiple cash outs in one request
3. **Scheduled Cash Outs**: Recurring cash out requests
4. **Fee Structure**: Platform fees on cash outs
5. **Tax Reporting**: Generate tax documents for cash outs
6. **Audit Trail**: Detailed logging of all cash out activities

### Monitoring
- Track cash out success/failure rates
- Monitor average cash out amounts
- Alert on failed transfers
- Balance reconciliation reports 