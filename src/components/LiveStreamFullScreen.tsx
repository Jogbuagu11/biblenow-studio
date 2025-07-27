import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore, useAuthStore, useLivestreamStore } from '../stores';
import { jaasConfig } from '../config/firebase';
import jwtAuthService from '../services/jwtAuthService';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface LiveStreamFullScreenProps {
  roomName: string;
  streamTitle: string;
  hostName: string;
  onClose: () => void;
}

const LiveStreamFullScreen: React.FC<LiveStreamFullScreenProps> = ({
  roomName,
  streamTitle,
  hostName,
  onClose
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentStream, updateViewerCount } = useLivestreamStore();
  const { 
    messages, 
    currentRoomId, 
    isLoading: chatLoading, 
    error: chatError,
    sendMessage, 
    joinRoom, 
    leaveRoom, 
    fetchMessages,
    addTypingUser,
    removeTypingUser,
    typingUsers
  } = useChatStore();

  const [newMessage, setNewMessage] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join room and fetch messages on component mount
  useEffect(() => {
    if (roomName) {
      joinRoom(roomName);
      fetchMessages(roomName);
      
      // Mock viewer count for now
      setViewerCount(500);
      
      // Update viewer count in store if we have a current stream
      if (currentStream) {
        updateViewerCount(currentStream.id, viewerCount);
      }
    }

    // Cleanup on unmount
    return () => {
      if (roomName) {
        leaveRoom(roomName);
      }
    };
  }, [roomName, currentStream]);

  // Initialize Jitsi with branding
  useEffect(() => {
    const initializeJitsi = async () => {
      if (!window.JitsiMeetExternalAPI) {
        console.error("Jitsi script not loaded.");
        return;
      }

      const container = document.getElementById('jitsi-container');
      if (!container) {
        console.error("Jitsi container not found.");
        return;
      }

    const domain = jaasConfig.domain;
    
    // Get user avatar for both authenticated and anonymous users
    let userAvatar = undefined;
    if (user) {
      try {
        const profileResult = await jwtAuthService.getUserProfile(user.uid);
        if (profileResult.success && profileResult.profile?.avatar_url) {
          userAvatar = profileResult.profile.avatar_url;
        }
      } catch (error) {
        console.error('Error fetching user avatar:', error);
      }
    }
    
    // Room name already includes the full JAAS App ID prefix from GoLiveModal
    const options: any = {
      roomName: roomName,
      parentNode: container,
      width: "100%",
      height: "100%",
      // JAAS configuration - your branding should be configured in JAAS dashboard
      appId: jaasConfig.appId,
      userInfo: {
        displayName: user?.displayName || "BibleNOW Studio User",
        email: user?.email || "user@biblenowstudio.com",
        avatar: userAvatar // Add avatar for both authenticated and anonymous users
      },
      // Public room settings - allow room creation without moderator or JWT
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableModeratorIndicator: true,
        startAudioOnly: false,
        // Allow public access without authentication
        guestDialOutEnabled: false,
        guestDialOutUrl: null,
        // Disable moderator requirements
        requireDisplayName: false,
        enableClosePage: true,
        // Allow anonymous users
        anonymousUserRole: 'guest',
        // Disable authentication requirements
        authenticationRequired: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'chat', 'recording',
          'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
          'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security',
          'shareaudio', 'sharevideo', 'shareddesktop', 'invite'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_POWERED_BY: false,
        SHOW_BRAND_WATERMARK: false,
        SHOW_PROMOTIONAL_CLOSE_PAGE: false
      }
    };

    jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    // Add event listeners for meeting end
    jitsiApiRef.current.addEventListeners({
      readyToClose: () => {
        console.log('Meeting ready to close');
        navigate('/dashboard');
      },
      videoConferenceJoined: () => {
        console.log('Joined video conference');
      },
      videoConferenceLeft: () => {
        console.log('Left video conference');
        navigate('/dashboard');
      },
      participantLeft: (participant: any) => {
        console.log('Participant left:', participant);
      },
      participantJoined: (participant: any) => {
        console.log('Participant joined:', participant);
      },
      hangup: () => {
        console.log('Meeting hung up');
        navigate('/dashboard');
      }
    });

    };

    // Call the async function
    initializeJitsi();

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [roomName, user, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || chatLoading) return;

    try {
      const displayName = user?.displayName || 'Anonymous';
      const profilePic = user?.photoURL || `https://via.placeholder.com/40/8B4513/FFFFFF?text=${displayName.charAt(0)}`;
      
      await sendMessage(newMessage, roomName, displayName, profilePic);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Add typing indicator
    if (user?.uid) {
      addTypingUser(user.uid);
      
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        removeTypingUser(user.uid);
      }, 3000);
    }
  };

  const formatTime = (timestamp: Date) => {
    if (!timestamp) return '';
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter messages for current room
  const roomMessages = messages.filter(message => message.roomId === roomName);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-yellow-600 text-white px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">https://biblenow.io/{roomName}</span>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Section */}
        <div className="flex-1 flex flex-col bg-yellow-800">
          {/* Video Player */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <div className="w-full h-full max-w-4xl" id="jitsi-container">
              {/* Jitsi will be loaded here via JavaScript */}
            </div>
          </div>

          {/* Stream Info */}
                      <div className="bg-yellow-700 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-white">{streamTitle}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <span className="text-white font-medium">{hostName}</span>
                </div>
              </div>
              <div className="text-white text-sm">
                {viewerCount.toLocaleString()} watching
              </div>
            </div>
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isFollowing 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-80 bg-yellow-700 flex flex-col">
          <div className="p-4 border-b border-yellow-600">
            <h3 className="text-white font-semibold">Live Chat</h3>
            {chatError && (
              <p className="text-red-300 text-xs mt-1">{chatError}</p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {roomMessages.length === 0 ? (
              <div className="text-center text-yellow-200 text-sm py-8">
                No messages yet. Be the first to say something!
              </div>
            ) : (
              roomMessages.map((message) => (
                <div key={message.id} className={`flex items-start space-x-2 ${
                  message.user === (user?.displayName || 'Anonymous') ? 'justify-end' : ''
                }`}>
                  {message.user !== (user?.displayName || 'Anonymous') && (
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-medium">
                        {message.user.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className={`max-w-xs ${
                    message.user === (user?.displayName || 'Anonymous') ? 'order-first' : ''
                  }`}>
                    <div className={`rounded-lg px-3 py-2 ${
                      message.user === (user?.displayName || 'Anonymous')
                                        ? 'bg-yellow-500 text-white'
                : 'bg-yellow-700 text-white'
                    }`}>
                      <div className="text-sm">{message.text}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {message.user} • {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className="text-yellow-200 text-xs italic">
                {typingUsers.length === 1 ? 'Someone is typing...' : `${typingUsers.length} people are typing...`}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-yellow-600">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type your message..."
                disabled={chatLoading}
                                  className="flex-1 bg-yellow-600 text-white placeholder-yellow-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !newMessage.trim()}
                                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-white p-2 rounded-lg transition-colors"
              >
                {chatLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStreamFullScreen; 