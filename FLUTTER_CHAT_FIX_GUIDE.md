# Flutter Chat Fix Guide - Complete Solution

## 🎯 Problem Summary
- Streamers could send chat messages but viewers couldn't see them
- After SQL fixes, streamers were blocked from chatting
- Flutter app needs proper real-time chat synchronization

## ✅ Complete Fix Applied

### 1. Database Fixes (Applied via SQL)
- ✅ Fixed RLS policies to allow proper chat access
- ✅ Enabled real-time subscriptions
- ✅ Created proper indexes for performance
- ✅ Added real-time notification triggers
- ✅ Granted proper permissions to authenticated users

### 2. Flutter App Requirements

#### A. Authentication (CRITICAL)
```dart
// Users MUST be authenticated to send messages
final user = Supabase.instance.client.auth.currentUser;
if (user == null) {
  // Redirect to login or show login prompt
  throw Exception('User must be authenticated to chat');
}
```

#### B. Room ID Format (MUST BE CONSISTENT)
```dart
// Both streamer and viewers MUST use the same room ID format
String getRoomId(String streamId) {
  // Use the stream's room_name from the database
  return streamId.toLowerCase().replaceAll(' ', '-');
}

// Example: If stream has room_name "user-12345-abcde"
// Both streamer and viewers use: "user-12345-abcde"
```

#### C. Chat Service Implementation
```dart
class ChatService {
  final SupabaseClient _supabase = Supabase.instance.client;
  RealtimeChannel? _currentChannel;
  final StreamController<List<ChatMessage>> _messageController = StreamController.broadcast();

  // Subscribe to messages
  Stream<List<ChatMessage>> subscribeToMessages(String roomId) {
    print('🔍 Subscribing to chat room: $roomId');
    
    // First fetch existing messages
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
          print('📨 Received real-time message for room: $roomId');
          _fetchMessages(roomId); // Refresh messages
        })
        .subscribe((status) {
          print('📡 Subscription status for room $roomId: $status');
        });
    
    return _messageController.stream;
  }

  // Fetch existing messages
  Future<void> _fetchMessages(String roomId) async {
    try {
      final response = await _supabase
          .from('livestream_chat')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', ascending: true)
          .limit(100);

      final messages = (response as List)
          .map((data) => ChatMessage.fromJson(data))
          .toList();

      _messageController.add(messages);
      print('📥 Fetched ${messages.length} messages for room: $roomId');
    } catch (e) {
      print('❌ Error fetching messages: $e');
    }
  }

  // Send message
  Future<void> sendMessage(String roomId, String text) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('User not authenticated');

    try {
      // Get user profile for display name and avatar
      final profile = await _getUserProfile(user.id);
      
      final messageData = {
        'room_id': roomId,
        'user_id': user.id,
        'user_name': profile?.displayName ?? user.email ?? 'Anonymous',
        'user_avatar': profile?.avatarUrl,
        'text': text.trim(),
        'is_moderator': profile?.isModerator ?? false,
      };

      await _supabase
          .from('livestream_chat')
          .insert([messageData]);

      print('✅ Message sent to room: $roomId');
    } catch (e) {
      print('❌ Error sending message: $e');
      rethrow;
    }
  }

  // Get user profile
  Future<UserProfile?> _getUserProfile(String userId) async {
    try {
      final response = await _supabase
          .from('verified_profiles')
          .select('first_name, last_name, profile_photo_url, is_moderator')
          .eq('id', userId)
          .single();

      return UserProfile.fromJson(response);
    } catch (e) {
      print('⚠️ Could not fetch user profile: $e');
      return null;
    }
  }

  // Cleanup
  void dispose() {
    _currentChannel?.unsubscribe();
    _messageController.close();
  }
}

// Chat message model
class ChatMessage {
  final String id;
  final String roomId;
  final String userId;
  final String userName;
  final String? userAvatar;
  final String text;
  final bool isModerator;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.roomId,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.text,
    required this.isModerator,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'],
      roomId: json['room_id'],
      userId: json['user_id'],
      userName: json['user_name'],
      userAvatar: json['user_avatar'],
      text: json['text'],
      isModerator: json['is_moderator'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}

// User profile model
class UserProfile {
  final String? firstName;
  final String? lastName;
  final String? profilePhotoUrl;
  final bool isModerator;

  UserProfile({
    this.firstName,
    this.lastName,
    this.profilePhotoUrl,
    required this.isModerator,
  });

  String get displayName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    } else if (firstName != null) {
      return firstName!;
    }
    return 'Anonymous';
  }

  String? get avatarUrl => profilePhotoUrl;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      firstName: json['first_name'],
      lastName: json['last_name'],
      profilePhotoUrl: json['profile_photo_url'],
      isModerator: json['is_moderator'] ?? false,
    );
  }
}
```

#### D. Chat Widget Implementation
```dart
class ChatWidget extends StatefulWidget {
  final String roomId; // Use the same room ID for all participants
  
  const ChatWidget({Key? key, required this.roomId}) : super(key: key);

  @override
  _ChatWidgetState createState() => _ChatWidgetState();
}

class _ChatWidgetState extends State<ChatWidget> {
  final ChatService _chatService = ChatService();
  final TextEditingController _messageController = TextEditingController();
  List<ChatMessage> _messages = [];
  late StreamSubscription<List<ChatMessage>> _messageSubscription;

  @override
  void initState() {
    super.initState();
    _subscribeToChat();
  }

  void _subscribeToChat() {
    print('🔍 Initializing chat for room: ${widget.roomId}');
    
    _messageSubscription = _chatService
        .subscribeToMessages(widget.roomId)
        .listen((messages) {
      setState(() {
        _messages = messages;
      });
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    try {
      await _chatService.sendMessage(widget.roomId, text);
      _messageController.clear();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send message: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Messages list
        Expanded(
          child: ListView.builder(
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final message = _messages[index];
              return ChatMessageWidget(message: message);
            },
          ),
        ),
        
        // Message input
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: InputDecoration(
                    hintText: 'Type a message...',
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              IconButton(
                onPressed: _sendMessage,
                icon: Icon(Icons.send),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _messageSubscription.cancel();
    _chatService.dispose();
    _messageController.dispose();
    super.dispose();
  }
}

class ChatMessageWidget extends StatelessWidget {
  final ChatMessage message;

  const ChatMessageWidget({Key? key, required this.message}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          CircleAvatar(
            radius: 16,
            backgroundImage: message.userAvatar != null 
                ? NetworkImage(message.userAvatar!) 
                : null,
            child: message.userAvatar == null 
                ? Text(message.userName[0].toUpperCase())
                : null,
          ),
          
          SizedBox(width: 8),
          
          // Message content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      message.userName,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: message.isModerator ? Colors.red : null,
                      ),
                    ),
                    if (message.isModerator) ...[
                      SizedBox(width: 4),
                      Icon(Icons.admin_panel_settings, size: 12, color: Colors.red),
                    ],
                  ],
                ),
                Text(message.text),
                Text(
                  DateFormat('HH:mm').format(message.createdAt),
                  style: TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

## 🔧 Testing Steps

### 1. Test Streamer Chat
```dart
// In your streamer app
final roomId = 'user-12345-abcde'; // Use actual room ID from stream
final chatWidget = ChatWidget(roomId: roomId);
```

### 2. Test Viewer Chat
```dart
// In your viewer app - MUST use the SAME room ID
final roomId = 'user-12345-abcde'; // Same as streamer
final chatWidget = ChatWidget(roomId: roomId);
```

### 3. Debug Information
```dart
void debugChatSetup(String roomId) {
  print('=== CHAT DEBUG ===');
  print('Room ID: $roomId');
  print('User: ${Supabase.instance.client.auth.currentUser?.email}');
  print('Authenticated: ${Supabase.instance.client.auth.currentUser != null}');
  print('==================');
}
```

## ✅ Expected Results

After applying these fixes:
- ✅ Streamers can send messages
- ✅ Viewers can see streamer messages
- ✅ Viewers can send messages
- ✅ Streamers can see viewer messages
- ✅ Real-time updates work in Flutter app
- ✅ Messages persist in database
- ✅ Proper user names and avatars display

## 🚨 Common Issues & Solutions

### Issue: "User not authenticated"
**Solution**: Ensure user is logged in before accessing chat

### Issue: "Messages not appearing"
**Solution**: Verify room ID is identical for all participants

### Issue: "Real-time not working"
**Solution**: Check Supabase real-time is enabled and user has proper permissions

### Issue: "RLS policy violation"
**Solution**: The SQL fix should resolve this - ensure it was applied correctly
