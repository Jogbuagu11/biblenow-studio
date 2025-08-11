# Flutter Supabase Chat Authentication Fix

## 🔐 Problem: "User not properly authenticated with Supabase" Error

The Flutter mobile app is failing to authenticate viewers with Supabase chat due to RLS (Row Level Security) policies requiring Supabase Auth authentication, but the app uses custom authentication.

## 🛠️ Solution: Fix Authentication for Chat

### 1. Update Supabase RLS Policies (Database Level)

Run this SQL in your Supabase SQL editor to allow chat access:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to read livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to insert livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to update livestream chat" ON livestream_chat;
DROP POLICY IF EXISTS "Allow authenticated users to read chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update chat rooms" ON chat_rooms;

-- Create permissive policies for custom authentication
CREATE POLICY "Allow all users to read livestream chat" ON livestream_chat
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert livestream chat" ON livestream_chat
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update livestream chat" ON livestream_chat
    FOR UPDATE USING (true);

-- Chat rooms policies
CREATE POLICY "Allow all users to read chat rooms" ON chat_rooms
    FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert chat rooms" ON chat_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update chat rooms" ON chat_rooms
    FOR UPDATE USING (true);
```

### 2. Update Flutter Chat Service

Replace your current chat service with this simplified version:

```dart
class ChatService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final ProfileService _profileService = ProfileService();
  RealtimeChannel? _currentChannel;
  
  // Send a message (simplified authentication)
  Future<void> sendMessage(String roomId, String text) async {
    final user = _supabase.auth.currentUser;
    
    // If no Supabase user, use custom auth
    if (user == null) {
      // Get user from your custom auth store
      final customUser = await _getCustomUser();
      if (customUser == null) {
        throw Exception('User not authenticated');
      }
      
      await _sendMessageWithCustomAuth(roomId, text, customUser);
      return;
    }
    
    // Use Supabase auth if available
    await _sendMessageWithSupabaseAuth(roomId, text, user);
  }
  
  // Send message with custom authentication
  Future<void> _sendMessageWithCustomAuth(String roomId, String text, CustomUser user) async {
    final messageData = {
      'room_id': roomId,
      'user_id': user.id,
      'user_name': user.displayName,
      'user_avatar': user.avatarUrl,
      'text': text.trim(),
      'is_moderator': false,
    };
    
    final response = await _supabase
        .from('livestream_chat')
        .insert([messageData]);
    
    if (response.error != null) {
      throw Exception('Failed to send message: ${response.error!.message}');
    }
  }
  
  // Send message with Supabase authentication
  Future<void> _sendMessageWithSupabaseAuth(String roomId, String text, User user) async {
    final profile = await _profileService.getUserProfile(user.id);
    final userName = profile?.fullName ?? user.email ?? 'Anonymous';
    final userAvatar = profile?.avatarUrl;
    
    final messageData = {
      'room_id': roomId,
      'user_id': user.id,
      'user_name': userName,
      'user_avatar': userAvatar,
      'text': text.trim(),
      'is_moderator': false,
    };
    
    final response = await _supabase
        .from('livestream_chat')
        .insert([messageData]);
    
    if (response.error != null) {
      throw Exception('Failed to send message: ${response.error!.message}');
    }
  }
  
  // Get custom user from your auth store
  Future<CustomUser?> _getCustomUser() async {
    // Implement based on your custom auth system
    // Example: return await CustomAuthStore.getCurrentUser();
    return null; // Replace with your implementation
  }
}
```

### 3. Update Authentication Flow

```dart
class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  // Sign in with custom authentication
  Future<void> signInWithCustomAuth(String email, String password) async {
    try {
      // Your custom authentication logic
      final customUser = await _authenticateCustomUser(email, password);
      
      if (customUser != null) {
        // Store in your custom auth store
        await _storeCustomUser(customUser);
        
        // Optionally try to sign in with Supabase (for RLS)
        await _trySupabaseAuth(email, password);
      }
    } catch (e) {
      throw Exception('Authentication failed: $e');
    }
  }
  
  // Try Supabase auth (optional, for RLS policies)
  Future<void> _trySupabaseAuth(String email, String password) async {
    try {
      await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );
    } catch (e) {
      // Don't fail if Supabase auth doesn't work
      print('Supabase auth failed (optional): $e');
    }
  }
}
```

### 4. Update Chat Widget

```dart
class ChatWidget extends StatefulWidget {
  final String roomId;
  
  const ChatWidget({Key? key, required this.roomId}) : super(key: key);
  
  @override
  _ChatWidgetState createState() => _ChatWidgetState();
}

class _ChatWidgetState extends State<ChatWidget> {
  final ChatService _chatService = ChatService();
  final TextEditingController _messageController = TextEditingController();
  List<ChatMessage> _messages = [];
  
  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    
    try {
      await _chatService.sendMessage(widget.roomId, text);
      _messageController.clear();
    } catch (e) {
      // Show error to user
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to send message: $e'),
          backgroundColor: Colors.red,
        ),
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
              return ChatMessageWidget(message: _messages[index]);
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
                ),
              ),
              SizedBox(width: 8),
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
}
```

### 5. Error Handling

```dart
// Add this to your chat service
Future<void> handleChatError(dynamic error) async {
  if (error.toString().contains('authentication')) {
    // Try to re-authenticate
    await _reAuthenticate();
  } else if (error.toString().contains('RLS')) {
    // RLS policy issue - show user-friendly message
    throw Exception('Chat access restricted. Please contact support.');
  } else {
    // Other error
    throw Exception('Failed to send message. Please try again.');
  }
}

Future<void> _reAuthenticate() async {
  // Implement your re-authentication logic
  // Example: await AuthService.refreshSession();
}
```

## 🚨 Critical Points

1. **RLS Policies**: Must be updated to allow custom authentication
2. **Dual Auth**: Handle both Supabase auth and custom auth gracefully
3. **Error Handling**: Provide clear error messages to users
4. **Fallback**: If Supabase auth fails, still allow chat with custom auth

## 📋 Implementation Checklist

- [ ] **Update RLS policies** in Supabase SQL editor
- [ ] **Replace chat service** with simplified version
- [ ] **Update authentication flow** to handle both auth systems
- [ ] **Add error handling** for authentication failures
- [ ] **Test chat functionality** with both auth methods
- [ ] **Update UI** to show appropriate error messages

## 🔧 Testing

```dart
// Test chat authentication
void testChatAuth() async {
  try {
    await chatService.sendMessage('test-room', 'Hello world');
    print('✅ Chat authentication working');
  } catch (e) {
    print('❌ Chat authentication failed: $e');
  }
}
```

This solution allows the Flutter app to use custom authentication while still accessing Supabase chat functionality by updating the RLS policies to be permissive rather than restrictive. 