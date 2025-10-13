# 🧪 Manual Test: Going Live Email Notifications

## Quick Test Guide

### Method 1: Supabase Dashboard (Easiest)

#### Step 1: Setup Test Data
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the setup queries from `test_going_live_notifications.sql`

#### Step 2: Test the Function
1. Go to **Functions** → **send-livestream-notification**
2. Click **Invoke function**
3. Use this test payload (replace USER_ID with actual user ID):

```json
{
  "streamer_id": "YOUR_USER_ID_HERE",
  "stream_id": "test-stream-12345",
  "stream_title": "Test Bible Study Session",
  "stream_description": "This is a test livestream to verify email notifications are working correctly. Join us for a spiritual journey!",
  "stream_url": "https://biblenow.io/live-stream?room=test-bible-study&title=Test+Bible+Study"
}
```

#### Step 3: Check Results
1. **Function Response**: Should return `{ success: true, notifications_sent: X }`
2. **Database Logs**: Check `studio_notifications` table for new entries
3. **Email Delivery**: Check inbox/spam for notification emails

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

### Method 3: Real Stream Creation

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
- Function returns `{ success: true, notifications_sent: X, total_followers: Y }`
- New entries in `studio_notifications` table with `type = 'livestream_notification_email'`
- Email delivered to followers (check inbox/spam)
- Professional HTML email template with stream details

### 📊 Check These Tables:
```sql
-- Recent notifications
SELECT * FROM studio_notifications 
WHERE type = 'livestream_notification_email' 
ORDER BY created_at DESC 
LIMIT 5;

-- Follower relationships
SELECT 
    uf.follower_id,
    uf.following_id,
    f.first_name as follower_name,
    f.email as follower_email,
    s.first_name as streamer_name,
    s.email as streamer_email
FROM user_follows uf
JOIN verified_profiles f ON uf.follower_id = f.id
JOIN verified_profiles s ON uf.following_id = s.id;

-- Email preferences
SELECT id, first_name, email_preferences 
FROM verified_profiles 
WHERE email_preferences IS NOT NULL;
```

## Troubleshooting

### ❌ Common Issues:

1. **"No followers found"**
   - Create test follow relationships
   - Ensure users are in `verified_profiles` table

2. **"Function not found"**
   - Deploy the function: `supabase functions deploy send-livestream-notification`
   - Check function is enabled in dashboard

3. **"Email not sent"**
   - Check `RESEND_API_KEY` environment variable
   - Verify email preferences are enabled
   - Check function logs for errors

4. **"Permission denied"**
   - Verify RLS policies are correct
   - Check service role key permissions

## Test Data Examples

### Sample Stream Data:
```json
{
  "streamer_id": "123e4567-e89b-12d3-a456-426614174000",
  "stream_id": "stream-2025-01-28-12345",
  "stream_title": "Morning Bible Study",
  "stream_description": "Join us for a peaceful morning study of the Book of Psalms",
  "stream_url": "https://biblenow.io/live-stream?room=morning-study&title=Morning+Bible+Study"
}
```

### Sample Email Preferences:
```json
{
  "livestreamNotifications": true,
  "streamingLimitEmails": true
}
```

## Verification Checklist

- [ ] Function deploys successfully
- [ ] Test users exist with follower relationships
- [ ] Email preferences are configured
- [ ] Resend API key is set
- [ ] Function returns success response
- [ ] Notifications are logged in database
- [ ] Emails are delivered to followers
- [ ] Email template renders correctly
- [ ] Links in emails work properly

## Next Steps After Testing

1. **Monitor email delivery rates**
2. **Check spam folders** for test emails
3. **Verify email template rendering** across different clients
4. **Test with different user scenarios** (no followers, disabled notifications, etc.)
5. **Performance test** with large follower counts

---

**Ready to test?** Start with Method 1 (Supabase Dashboard) for the easiest testing experience!
