import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import app, { auth } from '../config/firebase';

// Initialize Firestore using the existing Firebase app instance
const db = getFirestore(app);

export interface ChatMessage {
  id?: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Timestamp;
  roomId: string;
  isModerator?: boolean;
}

export interface ChatUser {
  uid: string;
  displayName: string;
  avatar?: string;
  isModerator: boolean;
}

class FirebaseChatService {
  private unsubscribe: (() => void) | null = null;
  private currentUser: User | null = null;

  constructor() {
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Subscribe to chat messages for a specific room
  subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    // Unsubscribe from previous listener if exists
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          text: data.text,
          userId: data.userId,
          userName: data.username || data.userName, // Handle both old and new field names
          userAvatar: data.userAvatar,
          timestamp: data.timestamp,
          roomId: roomId, // Use the roomId from the function parameter
          isModerator: data.isModerator || false
        });
      });
      callback(messages);
    }, (error) => {
      console.error('Error listening to messages:', error);
      // If there's an error, return empty messages array to prevent UI issues
      callback([]);
    });
  }

  // Send a new message
  async sendMessage(roomId: string, text: string, isModerator: boolean = false) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    if (!text.trim()) {
      throw new Error('Message cannot be empty');
    }

    try {
      const messageData = {
        text: text.trim(),
        userId: this.currentUser.uid,
        username: this.currentUser.displayName || 'Anonymous',
        userAvatar: this.currentUser.photoURL,
        timestamp: serverTimestamp(),
        isModerator: isModerator
      };

      await addDoc(collection(db, 'rooms', roomId, 'messages'), messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Unsubscribe from chat messages
  unsubscribeFromMessages() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // Get user display name
  getUserDisplayName(): string {
    if (this.currentUser?.displayName) {
      return this.currentUser.displayName;
    }
    
    const savedName = localStorage.getItem('chat_user_name');
    if (savedName) {
      return savedName;
    }
    
    const randomNames = ['Anonymous', 'Guest', 'Viewer', 'Listener'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    localStorage.setItem('chat_user_name', randomName);
    return randomName;
  }

  // Get user avatar
  getUserAvatar(): string {
    if (this.currentUser?.photoURL) {
      return this.currentUser.photoURL;
    }
    
    const savedPic = localStorage.getItem('chat_user_pic');
    if (savedPic) {
      return savedPic;
    }
    
    // Generate a random color for the profile picture
    const colors = ['#8B4513', '#2E8B57', '#4682B4', '#CD853F', '#708090'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const userInitial = this.getUserDisplayName().charAt(0);
    
    const profilePic = `https://via.placeholder.com/40/${randomColor.replace('#', '')}/FFFFFF?text=${userInitial}`;
    localStorage.setItem('chat_user_pic', profilePic);
    return profilePic;
  }

  // Check if user is moderator
  isModerator(): boolean {
    // You can implement your own logic here to determine if user is moderator
    // For now, we'll check if user is authenticated
    return !!this.currentUser;
  }
}

export const firebaseChatService = new FirebaseChatService();
export default firebaseChatService; 