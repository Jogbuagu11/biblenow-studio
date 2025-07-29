# Firebase Chat Integration for Livestreams

## Overview

The livestream now includes a split-screen Firebase chat functionality that allows streamers and viewers to communicate in real-time during live sessions.

## Features

### 🔥 **Real-time Chat**
- Instant message delivery using Firebase Firestore
- Real-time updates without page refresh
- Message history with timestamps

### 🎯 **Split-Screen Layout**
- Video stream on the left (70% width)
- Chat panel on the right (30% width)
- Toggle chat visibility with button
- Fullscreen mode support

### 👑 **Moderator Features**
- Streamers automatically get moderator status
- Moderator messages are highlighted with crown emoji
- Different styling for moderator vs regular messages

### 🎨 **User Experience**
- User avatars and display names
- Message bubbles with different colors for sender vs others
- Auto-scroll to latest messages
- Loading states and error handling

## Components

### 1. `LiveStreamWithChat.tsx`
Main component that combines video stream with chat functionality.

**Props:**
- `roomName`: The Jitsi room name
- `isStreamer`: Boolean to determine if user is the streamer

**Features:**
- Split-screen layout
- Chat toggle button
- Fullscreen toggle
- End stream button (for streamers)

### 2. `LiveStreamChat.tsx`
Dedicated chat component with real-time messaging.

**Props:**
- `roomId`: Firebase collection room ID
- `isModerator`: Boolean for moderator status
- `className`: Additional CSS classes

**Features:**
- Real-time message subscription
- Message sending with validation
- User avatars and names
- Timestamp formatting
- Error handling

### 3. `firebaseChatService.ts`
Firebase service for chat functionality.

**Key Methods:**
- `subscribeToMessages()`: Real-time message listening
- `sendMessage()`: Send new messages
- `getUserDisplayName()`: Get user display name
- `getUserAvatar()`: Get user avatar
- `isModerator()`: Check moderator status

## Firebase Configuration

The chat uses the same Firebase configuration as the main app:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyAjFArG3xSq2JGb8bNnqVBI3K-Gyf-dz8c",
  authDomain: "io-biblenow-authapp.firebaseapp.com",
  projectId: "io-biblenow-authapp",
  storageBucket: "io-biblenow-authapp.firebasestorage.app",
  messagingSenderId: "978185521714",
  appId: "1:978185521714:web:840d67807782ec9a928a2b",
  measurementId: "G-MC0BNXJLBT"
};
```

## Database Structure

### Firestore Collection: `chat_messages`

**Document Structure:**
```typescript
{
  text: string,           // Message content
  userId: string,         // Firebase auth user ID
  userName: string,       // Display name
  userAvatar?: string,    // Profile picture URL
  timestamp: Timestamp,   // Firebase server timestamp
  roomId: string,         // Room identifier
  isModerator?: boolean   // Moderator status
}
```

## Usage

### For Streamers
1. Go to `/go-live` and create a new stream
2. Click "Start Stream" to enter the livestream
3. Chat panel appears on the right side
4. Streamers automatically get moderator status
5. Use the end stream button to finish the session

### For Viewers
1. Join a livestream via the stream URL
2. Chat panel is available for real-time communication
3. Messages are displayed with user avatars and timestamps
4. Can toggle chat visibility if needed

## Security Rules

Make sure your Firestore security rules allow:
- Read access to `chat_messages` collection
- Write access for authenticated users
- Room-based filtering (optional)

Example Firestore rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chat_messages/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Customization

### Styling
- Chat colors can be customized in `LiveStreamChat.tsx`
- Layout proportions can be adjusted in `LiveStreamWithChat.tsx`
- Dark mode support is included

### Features
- Add message reactions
- Implement user typing indicators
- Add message moderation tools
- Include file/image sharing

## Troubleshooting

### Common Issues

1. **Chat not loading**
   - Check Firebase configuration
   - Verify Firestore rules
   - Check browser console for errors

2. **Messages not sending**
   - Ensure user is authenticated
   - Check network connectivity
   - Verify room ID is correct

3. **Real-time updates not working**
   - Check Firebase connection
   - Verify onSnapshot listener is active
   - Check for JavaScript errors

### Debug Mode
Enable console logging in `firebaseChatService.ts`:
```typescript
console.log('Message sent:', messageData);
console.log('Messages received:', messages);
```

## Future Enhancements

- [ ] Message reactions and emojis
- [ ] User typing indicators
- [ ] Message moderation tools
- [ ] File and image sharing
- [ ] Chat room management
- [ ] Message search functionality
- [ ] Chat export/backup
- [ ] Custom chat themes 