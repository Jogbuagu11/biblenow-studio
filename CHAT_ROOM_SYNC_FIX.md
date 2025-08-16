# Chat Room Sync Fix - Moderator & Viewer Messages

## 🔍 Problem: Moderator and Viewer Cannot See Each Other's Messages

The issue is likely that moderator and viewer are using different room IDs or the real-time subscriptions aren't working properly.

## 🛠️ Solution: Unified Chat Room System

### 1. Verify Room ID Consistency

Check that both moderator and viewer are using the **exact same room ID**:

```dart
// Both moderator and viewer must use the same room ID format
final roomId = 'biblenow-app/${streamId}'; // Must be identical

// Debug: Log room IDs to verify they match
print('Moderator room ID: $roomId');
print('Viewer room ID: $roomId');
```

### 2. Update Chat Service with Better Room Management

```dart
class ChatService {
  final SupabaseClient _supabase = Supabase.instance.client;
  RealtimeChannel? _currentChannel;
  
  // Subscribe to messages with proper room ID
  Stream<List<ChatMessage>> subscribeToMessages(String roomId) {
    print('Subscribing to chat room: $roomId');
    
    // First, fetch existing messages
    _fetchMessages(roomId);
    
    // Then subscribe to real-time updates
    _currentChannel = _supabase
        .channel('chat:$roomId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          table: 'livestream_chat',
          filter: PostgresChangeFilter(
            column: 'room_id',
            value: roomId,
          ),
        )
        .on((event, payload) {
          print('Received real-time message for room: $roomId');
          _fetchMessages(roomId);
        })
        .subscribe((status) {
          print('Subscription status for room $roomId: $status');
        });
    
    return _messageController.stream;
  }
  
  // Fetch messages with proper filtering
  Future<void> _fetchMessages(String roomId) async {
    try {
      print('Fetching messages for room: $roomId');
      
      final response = await _supabase
          .from('livestream_chat')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(100);
      
      if (response.error != null) {
        print('Error fetching messages: ${response.error!.message}');
        return;
      }
      
      final messages = (response.data as List)
          .map((json) => ChatMessage.fromJson(json))
          .toList();
      
      print('Fetched ${messages.length} messages for room: $roomId');
      _messageController.add(messages);
    } catch (e) {
      print('Error fetching messages: $e');
    }
  }
  
  // Send message with proper room ID
  Future<void> sendMessage(String roomId, String text) async {
    print('Sending message to room: $roomId');
    print('Message text: $text');
    
    final user = _supabase.auth.currentUser;
    final customUser = await _getCustomUser();
    
    if (user == null && customUser == null) {
      throw Exception('User not authenticated');
    }
    
    final messageData = {
      'room_id': roomId, // Ensure this matches exactly
      'user_id': user?.id ?? customUser?.id,
      'user_name': user?.email ?? customUser?.displayName ?? 'Anonymous',
      'user_avatar': customUser?.avatarUrl,
      'text': text.trim(),
      'is_moderator': false, // Set based on user role
    };
    
    print('Message data: $messageData');
    
    final response = await _supabase
        .from('livestream_chat')
        .insert([messageData]);
    
    if (response.error != null) {
      print('Error sending message: ${response.error!.message}');
      throw Exception('Failed to send message: ${response.error!.message}');
    }
    
    print('Message sent successfully to room: $roomId');
  }
}
```

### 3. Debug Room ID Generation

Add this to your LiveStream component:

```dart
// In your LiveStream component
class LiveStreamViewerScreen extends StatelessWidget {
  final String streamId;
  
  @override
  Widget build(BuildContext context) {
    // Ensure both moderator and viewer use the same room ID
    final roomId = 'biblenow-app/$streamId';
    
    print('=== CHAT ROOM DEBUG ===');
    print('Stream ID: $streamId');
    print('Room ID: $roomId');
    print('User Type: ${isModerator ? 'Moderator' : 'Viewer'}');
    print('=======================');
    
    return Scaffold(
      body: Row(
        children: [
          // Video player
          Expanded(
            flex: 7,
            child: VideoPlayerWidget(streamId: streamId),
          ),
          
          // Chat widget with same room ID
          Expanded(
            flex: 3,
            child: ChatWidget(roomId: roomId),
          ),
        ],
      ),
    );
  }
}
```

### 4. Verify Database Messages

Run this SQL to check if messages are being saved correctly:

```sql
-- Check all messages in the database
SELECT 
    room_id,
    user_name,
    text,
    created_at,
    COUNT(*) as message_count
FROM livestream_chat 
GROUP BY room_id, user_name, text, created_at
ORDER BY created_at DESC
LIMIT 20;

-- Check specific room
SELECT 
    room_id,
    user_name,
    text,
    created_at
FROM livestream_chat 
WHERE room_id = 'biblenow-app/your-stream-id'
ORDER BY created_at ASC;
```

### 5. Test Real-time Subscription

Add this debug code to verify subscriptions:

```dart
// Test real-time subscription
void testRealTimeSubscription(String roomId) {
  final channel = supabase
      .channel('test-chat:$roomId')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        table: 'livestream_chat',
        filter: PostgresChangeFilter(
          column: 'room_id',
          value: roomId,
        ),
      )
      .on((event, payload) {
        print('✅ Real-time message received:');
        print('Event: $event');
        print('Payload: $payload');
      })
      .subscribe((status) {
        print('📡 Subscription status: $status');
      });
}
```

### 6. Common Issues & Fixes

#### Issue 1: Different Room IDs
```dart
// ❌ Wrong - Different formats
moderatorRoomId = 'biblenow-app/stream-123';
viewerRoomId = 'stream-123';

// ✅ Correct - Same format
moderatorRoomId = 'biblenow-app/stream-123';
viewerRoomId = 'biblenow-app/stream-123';
```

#### Issue 2: Case Sensitivity
```dart
// ❌ Wrong - Different cases
moderatorRoomId = 'Biblenow-App/Stream-123';
viewerRoomId = 'biblenow-app/stream-123';

// ✅ Correct - Same case
moderatorRoomId = 'biblenow-app/stream-123';
viewerRoomId = 'biblenow-app/stream-123';
```

#### Issue 3: Subscription Not Working
```dart
// Add error handling to subscription
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
    .on((event, payload) {
      print('Message received: $payload');
      _fetchMessages(roomId);
    })
    .subscribe((status) {
      print('Subscription status: $status');
      if (status == 'CHANNEL_ERROR') {
        print('❌ Subscription failed, retrying...');
        // Retry subscription
        Future.delayed(Duration(seconds: 2), () {
          subscribeToMessages(roomId);
        });
      }
    });
```

### 7. Debug Checklist

- [ ] **Room IDs match exactly** between moderator and viewer
- [ ] **Case sensitivity** is consistent
- [ ] **Real-time subscription** is working
- [ ] **Messages are being saved** to the database
- [ ] **No network errors** in console
- [ ] **RLS policies** allow access to both users

### 8. Quick Test

```dart
// Add this to test chat functionality
void testChatSync() async {
  final roomId = 'biblenow-app/test-stream';
  
  // Send test message
  await chatService.sendMessage(roomId, 'Test message from ${userType}');
  
  // Check if message appears in database
  final messages = await chatService.fetchMessages(roomId);
  print('Messages in room: ${messages.length}');
  
  // Verify real-time subscription
  chatService.subscribeToMessages(roomId).listen((messages) {
    print('Real-time update: ${messages.length} messages');
  });
}
```

This should fix the issue where moderator and viewer cannot see each other's messages by ensuring they use the same room ID and have proper real-time subscriptions. 