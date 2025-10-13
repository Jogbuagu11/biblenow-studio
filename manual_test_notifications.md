# Manual Test: Livestream Notifications

## 🧪 Testing the Email Notification System

### Prerequisites
- At least 2 user accounts in the system
- One user should follow another user
- Email preferences should be enabled for the follower

### Test Steps

#### 1. **Setup Test Users**
```sql
-- Check if you have users with follower relationships
SELECT 
    uf.follower_id,
    uf.following_id,
    f.first_name as follower_name,
    f.email as follower_email,
    s.first_name as streamer_name,
    s.email as streamer_email
FROM user_follows uf
JOIN verified_profiles f ON uf.follower_id = f.id
JOIN verified_profiles s ON uf.following_id = s.id
LIMIT 5;
```

#### 2. **Test via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Functions** → **send-livestream-notification**
3. Click **Invoke function**
4. Use this test payload:

```json
{
  "streamer_id": "YOUR_STREAMER_USER_ID",
  "stream_id": "test-stream-12345",
  "stream_title": "Test Bible Study Session",
  "stream_description": "This is a test livestream to verify email notifications are working correctly.",
  "stream_url": "https://biblenow.io/live-stream?room=test-room&title=Test+Stream"
}
```

#### 3. **Test via Browser Console**
1. Open the BibleNOW Studio app
2. Log in as a user who has followers
3. Open browser developer console (F12)
4. Run this code:

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

#### 4. **Test via Stream Creation**
1. Log in as a user who has followers
2. Go to the "Go Live" page
3. Create a new livestream
4. Check if followers receive email notifications

### Expected Results

#### ✅ **Success Indicators:**
- Function returns success response
- Email notifications logged in `studio_notifications` table
- Followers receive emails (if they have notifications enabled)
- No errors in function logs

#### 📊 **Check These Tables:**
```sql
-- Check notification logs
SELECT * FROM studio_notifications 
WHERE type = 'livestream_notification_email' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check email preferences
SELECT id, first_name, email_preferences 
FROM verified_profiles 
WHERE email_preferences IS NOT NULL;

-- Check follower relationships
SELECT COUNT(*) as total_follows FROM user_follows;
```

### Troubleshooting

#### ❌ **Common Issues:**

1. **No followers found**
   - Create test follow relationships
   - Ensure users are in `verified_profiles` table

2. **Email not sent**
   - Check `RESEND_API_KEY` environment variable
   - Verify email preferences are enabled
   - Check function logs for errors

3. **Function not found**
   - Ensure `send-livestream-notification` function is deployed
   - Check function is enabled in Supabase dashboard

4. **Permission errors**
   - Verify RLS policies are correct
   - Check service role key permissions

### Test Data Examples

#### **Sample Stream Data:**
```json
{
  "streamer_id": "123e4567-e89b-12d3-a456-426614174000",
  "stream_id": "stream-2025-01-28-12345",
  "stream_title": "Morning Bible Study",
  "stream_description": "Join us for a peaceful morning study of the Book of Psalms",
  "stream_url": "https://biblenow.io/live-stream?room=morning-study&title=Morning+Bible+Study"
}
```

#### **Sample Email Preferences:**
```json
{
  "livestreamNotifications": true,
  "streamingLimitEmails": true
}
```

### Verification Checklist

- [ ] Function deploys successfully
- [ ] Test users exist with follower relationships
- [ ] Email preferences are configured
- [ ] Resend API key is set
- [ ] Function returns success response
- [ ] Notifications are logged in database
- [ ] Emails are delivered to followers
- [ ] Email template renders correctly
- [ ] Links in emails work properly

### Next Steps After Testing

1. **Monitor email delivery rates**
2. **Check spam folders** for test emails
3. **Verify email template rendering** across different clients
4. **Test with different user scenarios** (no followers, disabled notifications, etc.)
5. **Performance test** with large follower counts

---

**Note**: Remember to use test email addresses and avoid sending notifications to real users during testing!
