# Independent Email System Guide

## 🎯 **Overview**

The Independent Email System allows you to send streaming limit emails without relying on broken database triggers. It provides multiple ways to trigger emails manually and works completely independently of the usage recording system.

## 🚀 **Quick Start**

### 1. **Apply the Database Functions**
```sql
-- Run this in your Supabase SQL editor
-- Execute the independent_email_system.sql file
```

### 2. **Test the System**
```javascript
// Run this in your browser console
// Execute the test_independent_email_system.js file
```

## 📋 **Available Functions**

### **Database Functions (SQL)**

#### `send_streaming_limit_emails_manual(user_id, force_send)`
- **Purpose**: Send emails for a specific user or all users
- **Parameters**:
  - `user_id`: UUID of specific user (NULL for all users)
  - `force_send`: BOOLEAN to force send even if already sent this week
- **Returns**: Array of email results

#### `add_streaming_minutes_manual(user_id, minutes, week_start_date)`
- **Purpose**: Manually add streaming minutes for testing
- **Parameters**:
  - `user_id`: UUID of user
  - `minutes`: Number of minutes to add
  - `week_start_date`: Date (NULL for current week)
- **Returns**: Usage update results

#### `check_all_users_streaming_usage()`
- **Purpose**: Check usage for all users
- **Returns**: Array of user usage data

#### `send_all_pending_streaming_emails()`
- **Purpose**: Send all pending emails
- **Returns**: Summary of emails sent

### **Frontend Service (TypeScript)**

#### `IndependentEmailService.checkAllUsersStreamingUsage()`
```typescript
const usageData = await IndependentEmailService.checkAllUsersStreamingUsage();
console.log(`Found ${usageData.length} users with streaming data`);
```

#### `IndependentEmailService.sendAllPendingEmails()`
```typescript
const summary = await IndependentEmailService.sendAllPendingEmails();
console.log(`Sent ${summary.emails_sent} emails`);
```

#### `IndependentEmailService.sendEmailsForUser(userId, forceSend)`
```typescript
const results = await IndependentEmailService.sendEmailsForUser('user-uuid', false);
console.log('Email results:', results);
```

#### `IndependentEmailService.addStreamingMinutes(userId, minutes)`
```typescript
const result = await IndependentEmailService.addStreamingMinutes('user-uuid', 30);
console.log('Added minutes:', result);
```

### **API Endpoints (HTTP)**

#### `POST /api/send-streaming-emails`
```json
{
  "action": "all",        // "all", "warning", "reached", "check"
  "userId": "user-uuid",  // Optional: specific user
  "forceSend": false      // Optional: force send even if already sent
}
```

#### `GET /api/send-streaming-emails?action=check`
- Check all users streaming usage
- Returns usage data and email needs

## 🧪 **Testing Examples**

### **Test 1: Check Current Usage**
```sql
-- Check all users
SELECT * FROM check_all_users_streaming_usage();
```

### **Test 2: Add Minutes and Trigger Email**
```sql
-- Add 30 minutes to a user (replace with actual user ID)
SELECT * FROM add_streaming_minutes_manual(
  'your-user-uuid-here'::UUID, 
  30
);
```

### **Test 3: Send All Pending Emails**
```sql
-- Send emails to all users who need them
SELECT * FROM send_all_pending_streaming_emails();
```

### **Test 4: Send Email for Specific User**
```sql
-- Send emails for specific user
SELECT * FROM send_streaming_limit_emails_manual(
  'your-user-uuid-here'::UUID, 
  false
);
```

## 🔧 **Integration Options**

### **Option 1: Manual Trigger (Recommended)**
- Use the API endpoint or frontend service
- Call when you want to send emails
- No dependency on database triggers

### **Option 2: Scheduled Job**
```javascript
// Run every hour to check and send emails
setInterval(async () => {
  try {
    const summary = await IndependentEmailService.sendAllPendingEmails();
    console.log(`Sent ${summary.emails_sent} emails`);
  } catch (error) {
    console.error('Error sending emails:', error);
  }
}, 60 * 60 * 1000); // 1 hour
```

### **Option 3: Event-Based**
```javascript
// Send emails when a stream ends
const handleStreamEnd = async (streamData) => {
  // Update usage manually
  await IndependentEmailService.addStreamingMinutes(
    streamData.streamer_id, 
    streamData.duration_minutes
  );
  
  // Send emails if needed
  await IndependentEmailService.sendEmailsForUser(streamData.streamer_id);
};
```

## 📊 **Monitoring**

### **Check Email Status**
```sql
-- Check recent notifications
SELECT 
  type,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM studio_notifications 
WHERE type IN ('streaming_limit_warning', 'streaming_limit_reached')
AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY type;
```

### **Check Usage Data**
```sql
-- Check current week usage
SELECT 
  user_id,
  streamed_minutes,
  week_start_date
FROM livestream_weekly_usage 
WHERE week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
ORDER BY streamed_minutes DESC;
```

## 🚨 **Troubleshooting**

### **No Emails Being Sent**
1. Check if users have email addresses in `verified_profiles`
2. Check if users have streaming limits in `subscription_plans`
3. Check if usage data exists in `livestream_weekly_usage`
4. Check if emails were already sent this week

### **Edge Function Errors**
1. Verify `RESEND_API_KEY` is set
2. Check edge function logs in Supabase
3. Test edge function directly with sample data

### **Database Function Errors**
1. Check if functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%streaming%';`
2. Check permissions: `GRANT EXECUTE ON FUNCTION send_streaming_limit_emails_manual TO authenticated;`
3. Check RLS policies on `studio_notifications` table

## 🎯 **Benefits**

1. **Independent**: Works without database triggers
2. **Flexible**: Multiple ways to trigger emails
3. **Testable**: Easy to test with manual data
4. **Reliable**: No dependency on broken trigger system
5. **Monitorable**: Clear logging and status tracking

## 📝 **Next Steps**

1. **Apply the database functions** from `independent_email_system.sql`
2. **Test the system** using the test script
3. **Integrate into your app** using the frontend service or API endpoints
4. **Set up monitoring** to track email delivery
5. **Schedule regular checks** to ensure emails are sent

The independent email system gives you full control over when and how streaming limit emails are sent, without relying on the broken usage recording triggers!

