import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageCircle, X, Maximize2, Minimize2, CheckCircle } from 'lucide-react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';
import { jaasConfig } from '../config/jaas';
import jwtAuthService from '../services/jwtAuthService';
import { analyticsService } from '../services/analyticsService';
import { supabaseChatService, ChatMessage } from '../services/supabaseChatService';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface Props {
  roomName: string;
  isStreamer?: boolean;
}

const LiveStream: React.FC<Props> = ({ roomName, isStreamer = false }) => {
  // Ensure room name is properly formatted for Jitsi with JaaS app ID prefix
  const formattedRoomName = roomName ? 
    `${jaasConfig.appId}/${roomName.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase()}` : 
    `${jaasConfig.appId}/biblenow-room`;
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { user } = useSupabaseAuthStore();
  const [isEnding, setIsEnding] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Stream data state
  const [streamData, setStreamData] = useState<{
    title: string;
    hostName: string;
    hostAvatar: string;
    viewerCount: number;
    hostId?: string;
  }>({
    title: "Live Stream",
    hostName: "BibleNOW User",
    hostAvatar: "",
    viewerCount: 0,
    hostId: undefined
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Robust stream end handler
  const handleStreamEnd = useCallback(async (eventType: string) => {
    if (isEnding) {
      console.log('Stream end already in progress, skipping:', eventType);
      return;
    }

    setIsEnding(true);
    console.log(`Handling stream end event: ${eventType}`);

    try {
      if (user) {
        // Try multiple times to ensure stream is ended
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            await databaseService.endStreamOnRedirect(user.uid);
            console.log(`Stream ended successfully on attempt ${attempts + 1}`);
            break;
          } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed to end stream:`, error);
            
            if (attempts >= maxAttempts) {
              console.error('All attempts to end stream failed');
              throw error;
            }
            
            // Wait before retrying - capture attempts value to avoid closure issue
            const currentAttempt = attempts;
            await new Promise(resolve => setTimeout(resolve, 1000 * currentAttempt));
          }
        }
      }
    } catch (error) {
      console.error('Error ending stream:', error);
      // Don't throw here - we still want to redirect even if ending fails
    } finally {
      // Always redirect to endstream page
      window.location.href = '/endstream';
    }
  }, [user, isEnding]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch stream data and user profile
  useEffect(() => {
    const fetchStreamData = async () => {
      try {
        // Parse URL parameters to get stream info
        const urlParams = new URLSearchParams(window.location.search);
        const titleParam = urlParams.get('title');
        
        if (titleParam) {
          setStreamData(prev => ({
            ...prev,
            title: decodeURIComponent(titleParam)
          }));
        }

        // Get current user's profile for avatar and name
        if (user?.uid) {
          try {
            const userProfile = await databaseService.getUserProfile(user.uid);
            if (userProfile) {
              setStreamData(prev => ({
                ...prev,
                hostName: userProfile.full_name || userProfile.username || "BibleNOW User",
                hostAvatar: userProfile.avatar_url || "",
                hostId: user.uid
              }));
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching stream data:', error);
      }
    };

    fetchStreamData();
  }, [formattedRoomName, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if user is already following the streamer
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user?.uid || !streamData.hostId) return;
      
      try {
        const following = await databaseService.getFollowing(user.uid);
        const isFollowingStreamer = following.some(follow => follow.following_id === streamData.hostId);
        setIsFollowing(isFollowingStreamer);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [user?.uid, streamData.hostId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to chat messages
  useEffect(() => {
    console.log('Initializing chat for room:', formattedRoomName);
    
    const handleMessages = (newMessages: ChatMessage[]) => {
      console.log('Received chat messages:', newMessages.length);
      setMessages(newMessages);
    };

    supabaseChatService.subscribeToMessages(formattedRoomName, handleMessages);

    return () => {
      console.log('Cleaning up chat subscription for room:', formattedRoomName);
      supabaseChatService.unsubscribeFromMessages();
    };
  }, [formattedRoomName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Jitsi
  useEffect(() => {
    const initializeJitsi = async () => {
      // Dispose of any existing Jitsi instance first
      if (apiRef.current) {
        console.log('Disposing of existing Jitsi instance');
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi instance:', error);
        }
        apiRef.current = null;
      }

      // Clear the container to remove any existing elements
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      if (!window.JitsiMeetExternalAPI) {
        console.error("Jitsi script not loaded. Waiting for script to load...");
        // Wait a bit and try again
        setTimeout(() => {
          if (window.JitsiMeetExternalAPI) {
            initializeJitsi();
          } else {
            console.error("Jitsi script still not loaded after timeout");
          }
        }, 2000);
        return;
      }

      if (!containerRef.current) {
        console.error("Container ref not available.");
        return;
      }

      // Ensure container is empty and ready
      containerRef.current.innerHTML = '';

      // Generate JWT token based on Supabase verified profiles
      let jwtToken = null;
      let isModerator = false;
      
      if (user) {
        try {
          // Check if user is in verified_profiles table (moderator)
          const userProfile = await databaseService.getUserProfile(user.uid);
          isModerator = userProfile && userProfile.verified === true;
          
          if (isModerator) {
            jwtToken = await jwtAuthService.generateModeratorToken(user, formattedRoomName);
            console.log('Generated moderator JWT token for verified user');
          } else {
            console.log('User is logged in but not verified, joining as participant');
          }
        } catch (error) {
          console.error('Error checking user verification status:', error);
        }
      }

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
        roomName: formattedRoomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        // JAAS configuration - your branding should be configured in JAAS dashboard
        appId: jaasConfig.appId,
        userInfo: {
          displayName: user?.displayName || "BibleNOW Studio User",
          email: user?.email || "user@biblenowstudio.com",
          avatar: userAvatar // Add avatar for both authenticated and anonymous users
        },
        // Add JWT token if available
        ...(jwtToken && { jwt: jwtToken }),
        // Room settings with proper authentication
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableModeratorIndicator: false,
          startAudioOnly: false,
          guestDialOutEnabled: false,
          guestDialOutUrl: "",
          enableClosePage: false,
          // Authentication based on Supabase verified profiles
          anonymousUserRole: isModerator ? 'moderator' : 'guest',
          // Require authentication for verified users (moderators)
          authenticationRequired: isModerator,
          // JaaS Branding Configuration
          brandingRoomAlias: 'BibleNOW Studio',
          brandingRoomBackground: 'https://biblenowstudio.com/images/background.jpg',
          brandingRoomName: 'BibleNOW Studio',
          brandingRoomSubtitle: 'Live Ministry Stream',
          // Enable custom branding
          disableBranding: false,
          // Additional branding settings
          brandingRoomLogo: 'https://biblenowstudio.com/images/logo.png',
          brandingRoomWelcomeMessage: 'Welcome to BibleNOW Studio',
          brandingRoomWelcomePageSubtitle: 'Join the live ministry stream'
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone-else'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          DISABLE_CHAT: true,
          HIDE_CHAT_BUTTON: true,
          // JaaS Branding Properties
          APP_NAME: 'BibleNOW Studio',
          NATIVE_APP_NAME: 'BibleNOW Studio',
          PROVIDER_NAME: 'BibleNOW Studio',
          PRIMARY_COLOR: '#D97706', // Amber color
          BRAND_COLOR: '#D97706',
          // Additional interface branding
          TOOLBAR_ALWAYS_VISIBLE: true,
          SHOW_PREJOIN_PAGE: false,
          SHOW_WELCOME_PAGE: true,
          WELCOME_PAGE_LOGO_URL: 'https://biblenowstudio.com/images/logo.png',
          WELCOME_PAGE_TITLE: 'BibleNOW Studio',
          WELCOME_PAGE_SUBTITLE: 'Live Ministry Stream'
        }
      };

      console.log('Initializing Jitsi with options:', {
        roomName: options.roomName,
        appId: options.appId,
        hasJWT: !!jwtToken,
        isModerator,
        userAvatar: !!userAvatar
      });
      
      try {
        apiRef.current = new window.JitsiMeetExternalAPI(jaasConfig.domain, options);
        
        apiRef.current.on('readyToClose', () => {
          console.log('Jitsi readyToClose event');
          handleStreamEnd('readyToClose');
        });

        apiRef.current.on('videoConferenceJoined', () => {
          console.log('User joined video conference');
          analyticsService.trackViewerJoin(formattedRoomName, user?.uid || 'anonymous', streamData.hostId || 'unknown');
        });

        apiRef.current.on('videoConferenceLeft', () => {
          console.log('User left video conference');
          handleStreamEnd('videoConferenceLeft');
        });

        apiRef.current.on('participantJoined', (participant: any) => {
          console.log('Participant joined:', participant);
        });

        apiRef.current.on('participantLeft', (participant: any) => {
          console.log('Participant left:', participant);
        });

        console.log('Jitsi Meet initialized successfully');
      } catch (error) {
        console.error('Error initializing Jitsi Meet:', error);
      }
    };

    // Only initialize if user is logged in
    if (user) {
    initializeJitsi();
    }

    return () => {
      if (apiRef.current) {
        console.log('Cleaning up Jitsi instance');
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi instance:', error);
        }
        apiRef.current = null;
      }
    };
  }, [formattedRoomName, user, handleStreamEnd]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Don't render anything if user is not logged in
  if (!user) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">BibleNOW Studio</h1>
          <p className="mb-4">Please log in to access the livestream.</p>
          <p>Redirecting to app download...</p>
        </div>
      </div>
    );
  }

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    console.log('Sending message to room:', formattedRoomName, 'Message:', newMessage);
    setIsLoading(true);
    setError(null);

    try {
      // Allow all users to chat, not just verified users
      await supabaseChatService.sendMessage(formattedRoomName, newMessage, false);
      console.log('Message sent successfully');
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Format viewer count
  const formatViewerCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle follow/unfollow button click
  const handleFollowClick = async () => {
    if (!user?.uid || !streamData.hostId || isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await databaseService.unfollowUser(user.uid, streamData.hostId);
        setIsFollowing(false);
      } else {
        await databaseService.followUser(user.uid, streamData.hostId);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Video Stream Container */}
      <div className={`relative ${showChat ? 'flex-1' : 'flex-1'} bg-black`}>
        {/* Video Stream */}
        <div ref={containerRef} className="w-full h-full" />
        
        {/* Stream Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="bg-amber-950 bg-opacity-95 p-4 border-t border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Host Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center overflow-hidden">
                  {streamData.hostAvatar ? (
                    <img 
                      src={streamData.hostAvatar} 
                      alt={streamData.hostName}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback to initial if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = document.createElement('span');
                          fallback.className = 'text-white font-semibold';
                          fallback.textContent = streamData.hostName.charAt(0);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {streamData.hostName.charAt(0)}
                    </span>
                  )}
                </div>
                
                {/* Stream Info */}
                <div>
                  <h1 className="text-white text-xl font-bold">{streamData.title}</h1>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-300 text-lg font-medium">{streamData.hostName}</span>
                      <CheckCircle className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                    </div>
                    <span className="text-gray-300 text-sm">{formatViewerCount(streamData.viewerCount)} watching</span>
                  </div>
                </div>
              </div>
              
              {/* Follow/Unfollow Button */}
              <button 
                onClick={handleFollowClick}
                disabled={isFollowLoading}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isFollowLoading 
                    ? 'bg-gray-500 text-white cursor-not-allowed' 
                    : isFollowing 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                }`}
              >
                {isFollowLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Overlay Controls */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {/* Chat Toggle Button */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
            title={showChat ? 'Hide Chat' : 'Show Chat'}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          
          {/* End Stream Button (for streamers) */}
          {isStreamer && (
            <button
              onClick={() => handleStreamEnd('manual')}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              title="End Stream"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 border-l border-gray-700">
          {/* Chat Header */}
          <div className="p-4 border-b border-yellow-500 bg-gray-800">
            <h3 className="text-white font-semibold">Live Chat</h3>
            <p className="text-gray-400 text-xs mt-1">All BibleNOW users can chat</p>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.userId === user?.uid ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center overflow-hidden">
                      {message.userAvatar ? (
                        <img
                          src={message.userAvatar}
                          alt={message.userName}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to initial if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement('span');
                              fallback.className = 'text-white text-sm font-semibold';
                              fallback.textContent = message.userName.charAt(0);
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {message.userName.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className={`flex-1 max-w-xs ${
                    message.userId === user?.uid ? 'text-right' : ''
                  }`}>
                    <div className={`inline-block px-3 py-2 rounded-lg ${
                      message.userId === user?.uid
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-white'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium ${
                          message.userId === user?.uid
                            ? 'text-black'
                            : 'text-gray-300'
                        }`}>
                          {message.userName}
                        </span>
                      </div>
                      <p className="text-sm break-words">{message.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-red-900 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-gray-700">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !newMessage.trim()}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStream;
