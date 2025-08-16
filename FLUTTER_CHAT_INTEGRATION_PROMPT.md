# Flutter Chat Integration - Need to Know

## 🔐 Authentication
Users **MUST** be authenticated with Supabase to send messages. RLS blocks unauthenticated access.

```dart
// Ensure user is logged in before chat access
final user = Supabase.instance.client.auth.currentUser;
if (user == null) throw Exception('User not authenticated');
```

## 👤 User Profile Priority
```dart
// Display name priority order:
// 1. verified_profiles.first_name + last_name
// 2. profiles.first_name + last_name  
// 3. auth.display_name
// 4. auth.email
// 5. 'Anonymous'

// Avatar from profile_photo_url or avatar_url
```

## 💬 Chat Integration

### Room ID Format
```dart
final roomId = 'biblenow-app/${streamId}'; // Match Jitsi room name
```

### Message Structure
```dart
final messageData = {
  'room_id': roomId,
  'user_id': user.id,
  'user_name': userName, // From profile priority above
  'user_avatar': userAvatar, // From profile
  'text': text.trim(),
  'is_moderator': false,
};
```

### Real-time Subscription
```dart
final channel = supabase
    .channel('chat:$roomId')
    .onPostgresChanges(
      event: PostgresChangeEvent.insert,
      table: 'livestream_chat',
      filter: PostgresChangeFilter(
        column: 'room_id',
        value: roomId,
      ),
    )
    .subscribe();
```

## 🎯 Key Implementation

### 1. Send Message
```dart
Future<void> sendMessage(String roomId, String text) async {
  final user = supabase.auth.currentUser;
  if (user == null) throw Exception('Not authenticated');
  
  // Get profile data
  final profile = await getProfile(user.id);
  final userName = profile?.fullName ?? user.email ?? 'Anonymous';
  
  await supabase
      .from('livestream_chat')
      .insert([{
        'room_id': roomId,
        'user_id': user.id,
        'user_name': userName,
        'user_avatar': profile?.avatarUrl,
        'text': text.trim(),
        'is_moderator': false,
      }]);
}
```

### 2. Subscribe to Messages
```dart
Stream<List<ChatMessage>> subscribeToMessages(String roomId) {
  // Fetch existing messages first
  _fetchMessages(roomId);
  
  // Subscribe to real-time updates
  _channel = supabase
      .channel('chat:$roomId')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        table: 'livestream_chat',
        filter: PostgresChangeFilter(
          column: 'room_id',
          value: roomId,
        ),
      )
      .on((event, payload) => _fetchMessages(roomId))
      .subscribe();
  
  return _messageController.stream;
}
```

## 🚨 Critical Points

1. **Authentication Required**: Users must be logged in to send messages
2. **Room ID Sync**: Chat room ID must match Jitsi room name
3. **Profile Fallback**: Handle missing profile data gracefully
4. **Real-time Cleanup**: Unsubscribe when leaving chat
5. **Error Handling**: Catch auth failures and retry

## 📋 Quick Checklist

- [ ] User authenticated with Supabase
- [ ] Room ID matches Jitsi room: `biblenow-app/stream-id`
- [ ] Profile data fetched (verified_profiles → profiles → auth)
- [ ] Real-time subscription active
- [ ] Error handling for auth failures
- [ ] Cleanup on dispose

**That's it!** This covers the essential requirements for seamless livestream chat collaboration. 