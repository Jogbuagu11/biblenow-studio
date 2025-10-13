# 🧪 Testing Livestream Notifications

## Quick Test Guide

### Prerequisites Setup

#### Step 0: Setup Email Preferences Column
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the setup script from `setup_email_preferences.sql`
4. This will add the `email_preferences` column to the `verified_profiles` table

### Method 1: Supabase Dashboard (Recommended)

#### Step 1: Check System Status
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the test queries from `test_basic_notifications.sql` (if email_preferences column doesn't exist yet)
4. Or run `test_notifications_simple.sql` (after setting up email_preferences column)

#### Step 2: Test the Function
1. Go to **Functions** → **send-livestream-notification**
2. Click **Invoke function**
3. Use this test payload:

```json
{
  "streamer_id": "YOUR_USER_ID_HERE",
  "stream_id": "test-stream-12345",
  "stream_title": "Test Bible Study Session",
  "stream_description": "This is a test livestream to verify email notifications are working correctly.",
  "stream_url": "https://biblenow.io/live-stream?room=test-room&title=Test+Stream"
}
```

#### Step 3: Check Results
1. Go to **Table Editor** → **studio_notifications**
2. Look for new entries with `type = 'livestream_notification_email'`
3. Check your email inbox for notifications

### Method 2: Browser Console Test

#### Step 1: Open the App
1. Open BibleNOW Studio in your browser
2. Log in to your account
3. Open Developer Console (F12)

#### Step 2: Run Test Code
```javascript
// Test the notification system
async function testNotification() {
  const { data: { user } } = await window.supabase.auth.getUser();
  
  if (!user) {
    console.error('Please log in first');
    return;
  }

  const testData = {
    streamer_id: user.id,
    stream_id: 'test-' + Date.now(),
    stream_title: 'Test Stream - ' + new Date().toLocaleTimeString(),
    stream_description: 'Testing email notifications',
    stream_url: window.location.origin + '/live-stream?room=test&title=Test'
  };

  try {
    const result = await window.supabase.functions.invoke('send-livestream-notification', {
      body: testData
    });
    
    console.log('✅ Notification sent!', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testNotification();
```

### Method 3: Create a Real Stream

#### Step 1: Setup Test Users
1. Create two test accounts
2. Have one user follow the other
3. Ensure email preferences are enabled

#### Step 2: Create Stream
1. Log in as the user who has followers
2. Go to "Go Live" page
3. Create a new livestream
4. Check if followers receive email notifications

## Expected Results

### ✅ Success Indicators:
- Function returns `{ success: true, notifications_sent: X }`
- New entries in `studio_notifications` table
- Email delivered to followers (check inbox/spam)
- No errors in function logs

### 📊 Check These:
```sql
-- Recent notifications
SELECT * FROM studio_notifications 
WHERE type = 'livestream_notification_email' 
ORDER BY created_at DESC 
LIMIT 5;

-- Email preferences
SELECT id, first_name, email_preferences 
FROM verified_profiles 
WHERE email_preferences IS NOT NULL;

-- Follower relationships
SELECT COUNT(*) as total_follows FROM user_follows;
```

## Troubleshooting

### ❌ Common Issues:

1. **"Function not found"**
   - Deploy the function: `supabase functions deploy send-livestream-notification`
   - Check function is enabled in dashboard

2. **"No followers found"**
   - Create test follow relationships
   - Ensure users are in `verified_profiles` table

3. **"Email not sent"**
   - Check `RESEND_API_KEY` environment variable
   - Verify email preferences are enabled
   - Check function logs for errors

4. **"Permission denied"**
   - Verify RLS policies are correct
   - Check service role key permissions

## Test Files Created

- `test_livestream_notifications.js` - Node.js test script
- `test_client_notifications.js` - Browser console test
- `test_notifications_simple.sql` - SQL queries for dashboard
- `manual_test_notifications.md` - Detailed manual testing guide

## Quick Commands

```bash
# Deploy the notification function
supabase functions deploy send-livestream-notification

# Check function logs
supabase functions logs send-livestream-notification

# Test with curl (if you have the service key)
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-livestream-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"streamer_id":"USER_ID","stream_id":"test","stream_title":"Test","stream_url":"https://example.com"}'
```

## Next Steps

1. **Run the tests** using any of the methods above
2. **Check email delivery** in your inbox
3. **Verify template rendering** across different email clients
4. **Test with different scenarios** (no followers, disabled notifications, etc.)
5. **Monitor performance** with larger follower counts

---

**Ready to test?** Start with Method 1 (Supabase Dashboard) for the easiest testing experience!
