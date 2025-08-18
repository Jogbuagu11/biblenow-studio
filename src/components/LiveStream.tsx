import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageCircle, Maximize2, Minimize2, CheckCircle, Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff } from 'lucide-react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';
import { jitsiConfig } from '../config/jitsi';
import jwtAuthService from '../services/jwtAuthService';
import { analyticsService } from '../services/analyticsService';
import { supabaseChatService, ChatMessage } from '../services/supabaseChatService';
import { sanitizeRoomName } from '../utils/roomUtils';
import GiftBurst from './GiftBurst';
import { supabase } from '../config/supabase';

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
  // Ensure room name is properly formatted for self-hosted Jitsi (plain room slug, no JAAS appId)
  const formattedRoomName = roomName
    ? sanitizeRoomName(roomName)
    : sanitizeRoomName('BibleNOW Room');
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const { user } = useSupabaseAuthStore();
  const [isEnding, setIsEnding] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [appliedJitsiAvatar, setAppliedJitsiAvatar] = useState(false);
  
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
  const [giftOverlay, setGiftOverlay] = useState<null | { amount: number; sender?: string }>(null);

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
                hostName: userProfile.full_name || userProfile.username || user?.displayName || (user?.email ? user.email.split('@')[0] : "BibleNOW User"),
                hostAvatar: userProfile.avatar_url || userProfile.profile_photo_url || "",
                hostId: user.uid
              }));
            } else {
              // Fallback: derive host info from authenticated user
              setStreamData(prev => ({
                ...prev,
                hostName: user?.displayName || (user?.email ? user.email.split('@')[0] : prev.hostName),
                hostId: user.uid
              }));
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            // Fallback in case of error
            setStreamData(prev => ({
              ...prev,
              hostName: user?.displayName || (user?.email ? user.email.split('@')[0] : prev.hostName),
              hostId: user.uid
            }));
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

  // Subscribe to Shekelz gifts for this room and show overlay
  useEffect(() => {
    if (!formattedRoomName) return;

    const channel = supabase
      .channel(`gifts:${formattedRoomName}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'shekel_gifts',
        filter: `context_id=eq.${formattedRoomName}`
      }, async (payload: any) => {
        const gift = payload.new as any;
        setGiftOverlay({ amount: gift.amount, sender: gift.sender_name || undefined });
        // Optional: drop a system chat message so viewers see it persisted
        try {
          await supabase.from('livestream_chat').insert([{ 
            room_id: formattedRoomName,
            user_id: gift.sender_id,
            user_name: 'System',
            text: `🎁 ${gift.sender_name || 'A viewer'} sent ${gift.amount} Shekelz!`,
            is_moderator: true
          }]);
        } catch {}
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [formattedRoomName]);

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

      // Generate JWT token via server for self-hosted Jitsi
      let jwtToken = null;
      let isModerator = false;
      
      if (user) {
        try {
          // Check Supabase verified_profiles membership (moderator if a row exists)
          const { data: verifiedRow } = await supabase
            .from('verified_profiles')
            .select('id')
            .eq('id', user.uid)
            .maybeSingle();
          isModerator = !!verifiedRow;
          
          if (isModerator) {
            // Add: call server to get token
            try {
              const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
              const resp = await fetch(`${apiBase}/jitsi/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomTitle: formattedRoomName,
                  isModerator,
                  displayName: user?.displayName,
                  email: user?.email,
                  avatar: user?.photoURL
                })
              });
              const json = await resp.json();
              if (json?.token) {
                jwtToken = json.token;
              }
            } catch (e) {
              console.error('Failed to fetch Jitsi token from server:', e);
            }
            console.log('Generated moderator JWT token for verified user');
          } else {
            console.log('User is logged in but not verified, joining as participant');
          }
        } catch (error) {
          console.error('Error checking user verification status:', error);
        }
      }

      // Get user avatar for both authenticated and anonymous users
      let userAvatar: string | undefined = undefined;
      if (user) {
        try {
          const profileResult = await jwtAuthService.getUserProfile(user.uid);
          if (profileResult.success) {
            userAvatar = profileResult.profile?.avatar_url || (profileResult.profile as any)?.profile_photo_url || undefined;
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
        userInfo: {
          displayName: user?.displayName || "BibleNOW Studio User",
          email: user?.email || "user@biblenowstudio.com",
          avatar: userAvatar
        },
        ...(jwtToken && { jwt: jwtToken }),
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinConfig: { enabled: false },
          prejoinPageEnabled: false,
          disableModeratorIndicator: false,
          startAudioOnly: false,
          guestDialOutEnabled: false,
          guestDialOutUrl: "",
          enableClosePage: false,
          disableNotifications: true,
          disableReactions: true,
          disableSelfView: true,
          disableFilmstrip: true,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          SHOW_WELCOME_PAGE: false,
          TOOLBAR_BUTTONS: [],
          brandLabel: 'BibleNOW'
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
        apiRef.current = new window.JitsiMeetExternalAPI(jitsiConfig.domain, options);
        hasInitializedRef.current = true;
        
        apiRef.current.on('readyToClose', () => {
          console.log('Jitsi readyToClose event');
          handleStreamEnd('readyToClose');
        });

        apiRef.current.on('videoConferenceJoined', () => {
          console.log('User joined video conference');
          analyticsService.trackViewerJoin(formattedRoomName, user?.uid || 'anonymous', streamData.hostId || 'unknown');
          // Ensure display name and avatar are applied to the preview tile
          try {
            if (streamData.hostName) {
              apiRef.current.executeCommand('displayName', streamData.hostName);
            }
            if (user?.email) {
              apiRef.current.executeCommand('email', user.email);
            }
            if (typeof userAvatar === 'string' && userAvatar.length > 0) {
              // Not officially documented everywhere but supported on many builds
              apiRef.current.executeCommand('avatarUrl', userAvatar);
              setAppliedJitsiAvatar(!!userAvatar);
            }
          } catch (e) {
            console.warn('Optional avatarUrl command not supported on this Jitsi build');
            setAppliedJitsiAvatar(false);
          }
        });

        // Sync local state with Jitsi events
        apiRef.current.on('audioMuteStatusChanged', (event: any) => {
          setIsAudioMuted(!!event?.muted);
        });
        apiRef.current.on('videoMuteStatusChanged', (event: any) => {
          setIsVideoMuted(!!event?.muted);
        });
        apiRef.current.on('screenSharingStatusChanged', (event: any) => {
          setIsScreenSharing(!!event?.on);
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
      if (hasInitializedRef.current) return;
    initializeJitsi();
    }

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi instance on cleanup:', error);
        }
        apiRef.current = null;
      }
      hasInitializedRef.current = false;
      setAppliedJitsiAvatar(false);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  
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
      await supabaseChatService.sendMessage(formattedRoomName, newMessage, false, streamData.hostAvatar || undefined);
      console.log('Message sent successfully');
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Custom toolbar control handlers
  const handleToggleAudio = () => {
    try { apiRef.current?.executeCommand('toggleAudio'); } catch {}
    setIsAudioMuted(prev => !prev);
  };
  const handleToggleVideo = () => {
    try { apiRef.current?.executeCommand('toggleVideo'); } catch {}
    setIsVideoMuted(prev => !prev);
  };
  const handleToggleShare = () => {
    try { apiRef.current?.executeCommand('toggleShareScreen'); } catch {}
    setIsScreenSharing(prev => !prev);
  };
  const handleHangup = () => {
    try { apiRef.current?.executeCommand('hangup'); } catch {}
    handleStreamEnd('hangup');
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
      <div className="relative flex-1 bg-black">
        {/* Video Stream */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Top-left Branding Overlay to fully cover Jitsi watermark */}
        <div className="absolute top-0 left-0 z-[9999] pointer-events-none">
          <div className="bg-black/80 w-36 h-28 md:w-40 md:h-32 flex items-center justify-center">
            <img src="/logo172.png" alt="BibleNOW" className="h-12 md:h-16" />
          </div>
        </div>

        {/* Gift Burst Overlay */}
        {giftOverlay && (
          <GiftBurst amount={giftOverlay.amount} senderName={giftOverlay.sender} onDone={() => setGiftOverlay(null)} />
        )}

        {/* Centered Avatar Overlay when video is muted */}
        {isVideoMuted && streamData.hostAvatar && !appliedJitsiAvatar && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <img
              src={streamData.hostAvatar}
              alt={streamData.hostName}
              className="rounded-full object-cover shadow-xl w-[22vw] h-[22vw] max-w-64 max-h-64 min-w-24 min-h-24"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Stream Info Overlay */}
        <div className="absolute left-0 right-0 bottom-0 z-10">
          <div className="bg-amber-950 bg-opacity-95 p-4 border-t border-amber-800 pointer-events-auto">
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
                        if (parent && !parent.querySelector('span')) {
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

              {/* Custom Controls (Jitsi toolbar replacement) */}
              <div className="flex items-center space-x-3">
                <button onClick={handleToggleAudio} title={isAudioMuted ? 'Unmute' : 'Mute'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button onClick={handleToggleVideo} title={isVideoMuted ? 'Start camera' : 'Stop camera'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button onClick={handleToggleShare} title={isScreenSharing ? 'Stop sharing' : 'Share screen'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  <ScreenShare className="w-6 h-6" />
                </button>
                <button onClick={() => setShowChat(!showChat)} title={showChat ? 'Hide chat' : 'Show chat'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  <MessageCircle className="w-6 h-6" />
                </button>
                {isStreamer && (
                  <button onClick={handleHangup} title="End stream" className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all">
                    <PhoneOff className="w-6 h-6" />
                  </button>
                )}
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
          {/* Controls moved into brown bar; keep area reserved for layout alignment */}
          
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          
          {/* End Stream Button (for streamers) */}
          {/* End button moved to brown bar */}
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 border-l border-gray-700 flex flex-col h-full">
          {/* Chat Header */}
          <div className="p-4 border-b border-yellow-500 bg-gray-800">
            <h3 className="text-white font-semibold">Live Chat</h3>
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
                            if (parent && !parent.querySelector('span')) {
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
