# Chat Authentication Setup Guide

## Overview

This guide provides step-by-step instructions to properly set up Supabase livestream chat authentication. The chat system requires proper authentication to work with Row Level Security (RLS) policies.

## 🔧 Prerequisites

1. **Supabase Project**: Ensure your Supabase project is properly configured
2. **Environment Variables**: Verify your `.env` file has the correct Supabase credentials
3. **Database Access**: Ensure you have access to run SQL migrations

## 📋 Step-by-Step Setup

### Step 1: Apply Chat Tables Migration

Run the chat authentication setup script:

```bash
# Apply the chat tables and RLS policies
psql -d your_database -f scripts/setup_chat_authentication.sql
```

This script will:
- ✅ Create `chat_rooms` and `livestream_chat` tables
- ✅ Enable Row Level Security (RLS)
- ✅ Set up proper RLS policies for authenticated users
- ✅ Create automatic chat room creation triggers
- ✅ Grant necessary permissions

### Step 2: Verify Database Setup

Run the database inspection script:

```bash
node scripts/inspect_database_schema.js
```

You should see the new tables:
- `chat_rooms`
- `livestream_chat`

### Step 3: Test Chat Authentication

Run the comprehensive authentication test:

```bash
node scripts/test_chat_authentication.js
```

This test will verify:
- ✅ Unauthenticated access is blocked
- ✅ Authenticated access works
- ✅ Message sending works
- ✅ Real-time subscriptions work
- ✅ Chat room creation works
- ✅ User profile integration works

## 🔐 Authentication Flow

### 1. User Authentication
```typescript
// User must be authenticated with Supabase
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) {
  throw new Error('User not authenticated');
}
```

### 2. RLS Policies
The following policies are automatically applied:

**For `livestream_chat` table:**
- `SELECT`: Only authenticated users can read messages
- `INSERT`: Only authenticated users can send messages
- `UPDATE`: Only authenticated users can update messages

**For `chat_rooms` table:**
- `SELECT`: Only authenticated users can read chat rooms
- `INSERT`: Only authenticated users can create chat rooms
- `UPDATE`: Only authenticated users can update chat rooms

### 3. Message Sending Process
```typescript
// 1. Verify user authentication
const user = useSupabaseAuthStore.getState().user;
if (!user) throw new Error('User not authenticated');

// 2. Get user profile information
const profile = await supabase
  .from('verified_profiles')
  .select('first_name, last_name, avatar_url')
  .eq('id', user.uid)
  .single();

// 3. Send message with proper authentication
const messageData = {
  room_id: roomId,
  user_id: user.uid,
  user_name: userName,
  user_avatar: userAvatar,
  text: messageText,
  is_moderator: isModerator
};

const { error } = await supabase
  .from('livestream_chat')
  .insert([messageData]);
```

## 🚨 Common Issues & Solutions

### Issue 1: "User not authenticated" Error
**Symptoms:** Users can't send messages even when logged in
**Solution:**
```typescript
// Ensure user is properly authenticated with Supabase
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  // Re-authenticate user
  await supabase.auth.refreshSession();
}
```

### Issue 2: RLS Policy Violation
**Symptoms:** "new row violates row-level security policy"
**Solution:**
```sql
-- Verify RLS policies are correct
SELECT * FROM pg_policies WHERE tablename = 'livestream_chat';

-- Re-apply policies if needed
CREATE POLICY "Allow authenticated users to insert livestream chat" ON livestream_chat
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Issue 3: Real-time Not Working
**Symptoms:** Messages don't appear in real-time
**Solution:**
```typescript
// Ensure proper channel subscription
const channel = supabase
  .channel(`chat:${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'livestream_chat',
    filter: `room_id=eq.${roomId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe();
```

### Issue 4: Chat Room Not Created
**Symptoms:** Messages fail because chat room doesn't exist
**Solution:**
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_chat_room';

-- Re-create trigger if missing
CREATE TRIGGER trigger_create_chat_room
    BEFORE INSERT ON livestream_chat
    FOR EACH ROW
    EXECUTE FUNCTION create_chat_room_if_not_exists();
```

## 🧪 Testing Checklist

Before deploying to production, verify:

- [ ] **Unauthenticated Access**: Blocked properly
- [ ] **Authenticated Access**: Works for logged-in users
- [ ] **Message Sending**: Users can send messages
- [ ] **Real-time Updates**: Messages appear immediately
- [ ] **Chat Room Creation**: Automatic room creation works
- [ ] **User Profiles**: Display names and avatars work
- [ ] **Moderator Support**: Moderator messages are highlighted
- [ ] **Error Handling**: Proper error messages for failures

## 🔍 Debugging Commands

### Check RLS Status
```sql
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('chat_rooms', 'livestream_chat');
```

### Check Policies
```sql
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'livestream_chat');
```

### Check User Authentication
```sql
-- Test as authenticated user
SELECT auth.role(), auth.uid();
```

### Check Table Structure
```sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'livestream_chat'
ORDER BY ordinal_position;
```

## 🚀 Production Deployment

### 1. Apply Migrations
```bash
# Run in production database
psql -d production_database -f scripts/setup_chat_authentication.sql
```

### 2. Test Authentication
```bash
# Run comprehensive test
node scripts/test_chat_authentication.js
```

### 3. Monitor Logs
```bash
# Check for authentication errors
grep "authentication" logs/application.log
```

### 4. Verify Real-time
```bash
# Test real-time functionality
curl -X POST "https://your-project.supabase.co/rest/v1/livestream_chat" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"room_id":"test","user_id":"test","user_name":"Test","text":"Hello"}'
```

## 📞 Support

If you encounter issues:

1. **Check the test script output** for specific error messages
2. **Verify RLS policies** are correctly applied
3. **Ensure user authentication** is working properly
4. **Check real-time subscriptions** are connected
5. **Review database logs** for detailed error information

## 🔄 Migration from Firebase

If migrating from Firebase chat:

1. **Backup existing chat data** (if needed)
2. **Apply the new chat tables** using the setup script
3. **Update your frontend code** to use the new Supabase chat service
4. **Test thoroughly** before switching over
5. **Monitor for any issues** during the transition

---

**Note:** This setup ensures that only authenticated users can access and send chat messages, providing a secure and reliable chat experience for your livestream application. 