# Flutter "Join in Browser" Room URL Fix

## 🚨 **Problem**
Flutter viewer app users click "join in browser" from the pre-join page and join a **completely new Jitsi meeting** instead of the streamer's specific room.

## 🔍 **Root Cause**
**Room name format mismatch** between Flutter app and web app:

- **Flutter app**: Uses `biblenow-app/stream-id` format
- **Web app**: Was using `stream-title-slug` format  
- **Result**: Different room names = different Jitsi meetings

## ✅ **Solution Implemented**

### **1. Standardized Room Naming**
Both Flutter and web app now use the **same room format**:
```
biblenow-app/room-identifier
```

### **2. Created Room URL Service**
New service (`src/services/roomUrlService.ts`) ensures consistent room naming:

```typescript
// Generate consistent room name
const roomName = RoomUrlService.generateRoomName(streamTitle);

// Generate web URL for "join in browser"
const webUrl = RoomUrlService.generateWebRoomUrl(roomName, streamTitle);

// Generate direct Jitsi URL
const jitsiUrl = RoomUrlService.generateJitsiDirectUrl(roomName);
```

### **3. Updated Web App**
- **GoLiveModal**: Now generates `biblenow-app/title-slug` format
- **LiveStream**: Parses room names consistently
- **Room validation**: Ensures proper format

## 🔧 **Flutter App Changes Needed**

### **Update Room Name Generation**
```dart
// OLD (causing mismatch):
final roomId = 'biblenow-app/${streamId}';

// NEW (consistent with web):
final roomId = 'biblenow-app/${_generateRoomSlug(streamTitle)}';

String _generateRoomSlug(String title) {
  return title
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]'), '-')
      .replaceAll(RegExp(r'-+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
}
```

### **Update "Join in Browser" URL**
```dart
// Generate the correct web URL for "join in browser"
String generateJoinInBrowserUrl(String roomName, String streamTitle) {
  final baseUrl = 'https://biblenowstudio.com'; // or your domain
  final encodedRoom = Uri.encodeComponent(roomName);
  final encodedTitle = Uri.encodeComponent(streamTitle);
  
  return '$baseUrl/live-stream?room=$encodedRoom&title=$encodedTitle';
}
```

### **Example Implementation**
```dart
class StreamService {
  String generateRoomName(String streamTitle) {
    final slug = streamTitle
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    
    return 'biblenow-app/$slug';
  }
  
  String generateWebUrl(String roomName, String streamTitle) {
    final baseUrl = 'https://biblenowstudio.com';
    final encodedRoom = Uri.encodeComponent(roomName);
    final encodedTitle = Uri.encodeComponent(streamTitle);
    
    return '$baseUrl/live-stream?room=$encodedRoom&title=$encodedTitle';
  }
}
```

## 🧪 **Testing**

### **Test Cases**
1. **Same Room Names**: Flutter and web app generate identical room names for same stream title
2. **Join in Browser**: Flutter "join in browser" links go to correct web stream
3. **Cross-Platform**: Users from both platforms join the same Jitsi room
4. **Room Validation**: All room names follow `biblenow-app/identifier` format

### **Verification Steps**
1. Create a stream with title "She was polluted with them"
2. Verify Flutter generates room: `biblenow-app/she-was-polluted-with-them`
3. Verify web app generates same room name
4. Test "join in browser" from Flutter app
5. Confirm users join the same Jitsi meeting

## 📋 **Implementation Checklist**

### **Flutter App**
- [ ] Update room name generation to use title-based slugs
- [ ] Update "join in browser" URL generation
- [ ] Test room name consistency with web app
- [ ] Verify cross-platform room joining

### **Web App** (Already Done)
- [x] Created RoomUrlService for consistent naming
- [x] Updated GoLiveModal to use standardized format
- [x] Updated LiveStream to parse room names consistently
- [x] Added room name validation

## 🎯 **Expected Result**
After implementing these changes:
- ✅ Flutter and web app users join the **same Jitsi room**
- ✅ "Join in browser" links work correctly
- ✅ No more separate/random Jitsi meetings
- ✅ Consistent room naming across platforms

## 🚀 **Deployment Notes**
1. Deploy web app changes first
2. Update Flutter app with new room naming
3. Test cross-platform compatibility
4. Monitor for any room name mismatches

This fix ensures that all users, regardless of platform, join the same livestream room and can interact with each other seamlessly.
