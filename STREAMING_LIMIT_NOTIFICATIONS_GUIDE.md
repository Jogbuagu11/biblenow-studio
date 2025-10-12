# Streaming Limit Notifications - Complete Implementation Guide

## 🎯 **Problem Solved**
The previous notification system was broken because:
- ❌ Triggers referenced non-existent `livestream_weekly_usage` table
- ❌ Called `databaseService.sendStreamingLimitEmails()` which doesn't exist in database context
- ❌ No proper notification infrastructure
- ❌ Notifications weren't being triggered when streams ended

## ✅ **New Solution**

### **1. Proper Database Infrastructure**
- ✅ **`streaming_limit_notifications` table** - Stores all notification data
- ✅ **Direct calculation from `livestreams` table** - No dependency on removed tables
- ✅ **Proper trigger on `livestreams` table** - Fires when streams end
- ✅ **Helper functions** - Calculate usage and limits properly

### **2. Notification Processing Service**
- ✅ **`StreamingLimitNotificationService`** - Processes pending notifications
- ✅ **Email integration** - Uses existing email service
- ✅ **Error handling** - Robust error handling and logging
- ✅ **Statistics** - Track notification performance

## 🚀 **Implementation Steps**

### **Step 1: Run the Database Fix**
```sql
-- Run this SQL script in your Supabase SQL editor
-- fix_livestream_notification_infrastructure.sql
```

This will:
- Create `streaming_limit_notifications` table
- Create proper trigger on `livestreams` table
- Create helper functions for usage calculation
- Create notification processing functions

### **Step 2: Update Your Application**

#### **A. Import the New Service**
```typescript
import { StreamingLimitNotificationService } from './services/streamingLimitNotificationService';
```

#### **B. Process Notifications Regularly**
Add this to your main application or create a cron job:

```typescript
// Process notifications every 5 minutes
setInterval(async () => {
  try {
    const result = await StreamingLimitNotificationService.processPendingNotifications();
    console.log('Notification processing result:', result);
  } catch (error) {
    console.error('Error processing notifications:', error);
  }
}, 5 * 60 * 1000); // 5 minutes
```

#### **C. Test the System**
```javascript
// Run this in browser console to test
// test_notification_system.js
```

### **Step 3: Monitor the System**

#### **A. Check Notification Stats**
```typescript
const stats = await StreamingLimitNotificationService.getNotificationStats();
console.log('Notification stats:', stats);
```

#### **B. Test User Usage**
```typescript
const usage = await StreamingLimitNotificationService.getUserStreamingUsage(userId);
console.log('User usage:', usage);
```

#### **C. Manual Notification Test**
```typescript
const result = await StreamingLimitNotificationService.triggerNotificationCheck(userId);
console.log('Manual test result:', result);
```

## 🔧 **How It Works**

### **1. Stream End Trigger**
When a livestream ends (`status` changes to `'ended'`):
1. **Calculate usage** - Sum all stream durations for the current week
2. **Get user limit** - From subscription plan
3. **Check thresholds** - 75% warning, 100% limit reached
4. **Create notifications** - Only if not already sent this week

### **2. Notification Processing**
The service processes pending notifications:
1. **Fetch pending notifications** - From `streaming_limit_notifications` table
2. **Send emails** - Using existing email service
3. **Mark as processed** - Update notification status
4. **Handle errors** - Log errors and mark as processed

### **3. Email Types**

#### **Warning Email (75% threshold)**
- Sent when user reaches 75% of weekly limit
- Includes remaining minutes and reset date
- Encourages plan upgrade

#### **Limit Reached Email (100% threshold)**
- Sent when user reaches 100% of weekly limit
- Explains limit reached and reset schedule
- Provides upgrade options

## 📊 **Database Schema**

### **`streaming_limit_notifications` Table**
```sql
CREATE TABLE streaming_limit_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES verified_profiles(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('warning', 'reached')),
    usage_percentage NUMERIC(5,2) NOT NULL,
    current_minutes INTEGER NOT NULL,
    limit_minutes INTEGER NOT NULL,
    remaining_minutes INTEGER NOT NULL,
    reset_date DATE NOT NULL,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
```

### **Key Functions**
- `get_weekly_streaming_usage(user_id, week_start_date)` - Calculate usage from livestreams
- `get_user_streaming_limit(user_id)` - Get user's streaming limit
- `process_pending_streaming_notifications()` - Get pending notifications
- `mark_notification_processed(notification_id, email_sent)` - Mark as processed

## 🧪 **Testing**

### **1. Test Database Functions**
```sql
-- Test usage calculation
SELECT get_weekly_streaming_usage('user-id-here');

-- Test limit retrieval
SELECT get_user_streaming_limit('user-id-here');

-- Test complete system
SELECT * FROM test_streaming_limit_system('user-id-here');
```

### **2. Test Notification Creation**
```typescript
// Manually trigger notification check
const result = await StreamingLimitNotificationService.triggerNotificationCheck(userId);
console.log('Notifications created:', result.notificationsCreated);
```

### **3. Test Email Processing**
```typescript
// Process pending notifications
const result = await StreamingLimitNotificationService.processPendingNotifications();
console.log('Processing result:', result);
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Notifications Not Created**
- Check if trigger is active: `SELECT * FROM pg_trigger WHERE tgname = 'streaming_limit_notification_trigger';`
- Check if streams are ending properly: `SELECT * FROM livestreams WHERE status = 'ended' ORDER BY ended_at DESC LIMIT 10;`

#### **2. Emails Not Sending**
- Check email service configuration
- Check notification processing logs
- Verify user email addresses in `verified_profiles`

#### **3. Usage Calculation Wrong**
- Check if streams have proper `started_at` and `ended_at` values
- Verify week calculation: `SELECT DATE_TRUNC('week', CURRENT_DATE)::DATE;`

### **Debug Queries**
```sql
-- Check recent notifications
SELECT * FROM streaming_limit_notifications ORDER BY created_at DESC LIMIT 10;

-- Check user usage
SELECT * FROM test_streaming_limit_system('user-id-here');

-- Check pending notifications
SELECT * FROM process_pending_streaming_notifications();
```

## 📈 **Monitoring & Analytics**

### **Key Metrics to Track**
- Total notifications created
- Email delivery rate
- User engagement with limit warnings
- Plan upgrades after notifications

### **Dashboard Queries**
```sql
-- Daily notification stats
SELECT 
    DATE(created_at) as date,
    type,
    COUNT(*) as count,
    SUM(CASE WHEN email_sent THEN 1 ELSE 0 END) as emails_sent
FROM streaming_limit_notifications
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), type
ORDER BY date DESC;

-- User engagement
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN email_sent THEN 1 ELSE 0 END) as emails_sent,
    MAX(created_at) as last_notification
FROM streaming_limit_notifications
GROUP BY user_id
ORDER BY total_notifications DESC;
```

## ✅ **Expected Results**

After implementation:
- ✅ **Notifications trigger automatically** when streams end
- ✅ **Emails send reliably** for 75% and 100% thresholds
- ✅ **No duplicate notifications** within the same week
- ✅ **Proper error handling** and logging
- ✅ **Easy monitoring** and debugging
- ✅ **Scalable infrastructure** for future enhancements

The new system is robust, reliable, and provides comprehensive monitoring capabilities for streaming limit notifications.
