import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageCircle, Maximize2, Minimize2, CheckCircle, Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff } from 'lucide-react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';
import { supabaseChatService, ChatMessage } from '../services/supabaseChatService';
import { supabase } from '../config/supabase';
import { jitsiConfig } from '../config/jitsi';
import GiftBurst from './GiftBurst';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
    interfaceConfig?: any;
    config?: any;
  }
}

interface Props {
  roomName: string;
  isStreamer?: boolean;
}

const LiveStream: React.FC<Props> = ({ roomName: propRoomName, isStreamer = false }) => {
  // Get room name from URL parameters or props
  const urlParams = new URLSearchParams(window.location.search);
  const rawRoomName = urlParams.get('room') || propRoomName || 'bible-study';
  // Ensure room name format is consistent for JWT token
  const roomName = rawRoomName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const { user } = useSupabaseAuthStore();
  const [isEnding, setIsEnding] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJitsiReady, setIsJitsiReady] = useState(false);
  const [moderators, setModerators] = useState<string[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  
  // Jitsi refs
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  
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
  }, [messages, scrollToBottom]);

  // Stream end handler
  const handleStreamEnd = useCallback(async () => {
    if (isEnding) return;
    setIsEnding(true);
    
    try {
      if (user) {
        await databaseService.endStreamOnRedirect(user.uid);
      }
    } catch (error) {
      console.error('Error ending stream:', error);
    } finally {
      window.location.href = '/endstream';
    }
  }, [user, isEnding]);

  // Appoint moderator function
  const appointModerator = useCallback((participantId: string) => {
    if (apiRef.current && isModerator) {
      try {
        apiRef.current.executeCommand('setModerator', participantId);
        console.log('Appointed moderator:', participantId);
      } catch (error) {
        console.error('Error appointing moderator:', error);
      }
    }
  }, [isModerator]);

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
        } else {
          // Fallback to room name as title
          setStreamData(prev => ({
            ...prev,
            title: roomName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          }));
        }

        // Get current user's profile for avatar and name
        if (user?.uid) {
          try {
            const userProfile = await databaseService.getUserProfile(user.uid);
            if (userProfile) {
              setStreamData(prev => ({
                ...prev,
                hostName: userProfile.full_name || userProfile.username || user?.displayName || "BibleNOW User",
                hostAvatar: userProfile.avatar_url || userProfile.profile_photo_url || "",
                hostId: user.uid
              }));
            } else {
              setStreamData(prev => ({
                ...prev,
                hostName: user?.displayName || "BibleNOW User",
                hostId: user.uid
              }));
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setStreamData(prev => ({
              ...prev,
              hostName: user?.displayName || "BibleNOW User",
              hostId: user.uid
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching stream data:', error);
      }
    };

    fetchStreamData();
  }, [roomName, user?.uid]);

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
  }, [user?.uid, streamData.hostId]);

  // Subscribe to chat messages
  useEffect(() => {
    console.log('Initializing chat for room:', roomName);
    
    const handleMessages = (newMessages: ChatMessage[]) => {
      console.log('Received chat messages:', newMessages.length);
      setMessages(newMessages);
    };

    supabaseChatService.subscribeToMessages(roomName, handleMessages);

    return () => {
      console.log('Cleaning up chat subscription for room:', roomName);
      supabaseChatService.unsubscribeFromMessages();
    };
  }, [roomName]);

  // Subscribe to Shekelz gifts for this room and show overlay
  useEffect(() => {
    if (!roomName) return;

    const channel = supabase
      .channel(`gifts:${roomName}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'shekel_gifts',
        filter: `context_id=eq.${roomName}`
      }, async (payload: any) => {
        const gift = payload.new as any;
        setGiftOverlay({ amount: gift.amount, sender: gift.sender_name || undefined });
        // Optional: drop a system chat message so viewers see it persisted
        try {
          await supabase.from('livestream_chat').insert([{ 
            room_id: roomName,
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
  }, [roomName]);

  // Initialize Jitsi
  useEffect(() => {
    const initializeJitsi = async () => {
      // Clean up any existing instance
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi instance:', error);
        }
        apiRef.current = null;
      }

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Let Jitsi handle media permissions per docs

      // Wait for Jitsi script to load with retry
      let retryCount = 0;
      const maxRetries = 10;
      
      const waitForJitsi = () => {
        if (window.JitsiMeetExternalAPI) {
          console.log("Jitsi script loaded successfully");
          return true;
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Waiting for Jitsi script... (${retryCount}/${maxRetries})`);
          setTimeout(waitForJitsi, 500);
          return false;
        }
        
        console.error("Jitsi script failed to load after retries");
        return false;
      };
      
      if (!waitForJitsi()) {
        return;
      }

      if (!containerRef.current) {
        console.error("Container ref not available");
        return;
      }

      // Get JWT token for custom Jitsi server - required for all users
      let jwtToken = null;
      let isModerator = false;
      
      if (user) {
        try {
          // Check if user exists in either verified_profiles or profiles table
          let userProfile = null;
          let isModerator = false;
          
                      // First check verified_profiles table
            try {
              const verifiedProfile = await databaseService.getUserProfile(user.uid);
              if (verifiedProfile) {
                userProfile = verifiedProfile;
                console.log('User found in verified_profiles table');
              }
            } catch (error) {
              console.log('User not found in verified_profiles table, checking profiles table...');
            }
            
            // If not in verified_profiles, check profiles table
            if (!userProfile) {
              try {
                const { data: profileData, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', user.uid)
                  .single();
                
                if (profileData && !error) {
                  userProfile = profileData;
                  console.log('User found in profiles table');
                }
              } catch (error) {
                console.log('User not found in profiles table either');
              }
            }
          
          // If not in verified_profiles, check profiles table
          if (!userProfile) {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.uid)
                .single();
              
              if (profileData && !error) {
                userProfile = profileData;
                console.log('User found in profiles table');
              }
            } catch (error) {
              console.log('User not found in profiles table either');
            }
          }
          
          // If user is not found in either table, they shouldn't have access
          if (!userProfile) {
            console.error('User not found in any profile table');
            window.location.href = '/login';
            return;
          }
          
          // Check if this is the first user to join (moderator)
          // Only users from verified_profiles table can be moderators
          // The first user who creates the stream becomes the moderator
          const isFromVerifiedProfiles = userProfile && 'subscription_plan' in userProfile;
          const moderatorStatus = isStreamer && isFromVerifiedProfiles;
          setIsModerator(moderatorStatus);
          
          console.log('User profile found, moderator status:', moderatorStatus ? 'MODERATOR' : 'VIEWER');
          console.log('User table:', isFromVerifiedProfiles ? 'verified_profiles' : 'profiles');
          
          // Always try to get JWT token for authenticated users
          try {
            console.log('Generating JWT token for room:', roomName);
            const jwtAuthService = await import('../services/jwtAuthService');
            jwtToken = await jwtAuthService.default.generateJitsiToken(
              {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'BibleNOW User'
              },
              roomName,
              moderatorStatus
            );
            console.log('JWT token generated successfully:', jwtToken ? 'YES' : 'NO');
          } catch (e) {
            console.error('Failed to generate JWT token:', e);
            // If JWT token generation fails, redirect to login
            window.location.href = '/login';
            return;
          }
        } catch (error) {
          console.error('Error checking user verification status:', error);
          // If user verification fails, redirect to login
          window.location.href = '/login';
          return;
        }
      } else {
        // No user authenticated, redirect to login
        console.log('No authenticated user found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      const options = {
        roomName: roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: {
          displayName: user?.displayName || "BibleNOW User",
          email: user?.email || "user@biblenowstudio.com"
        },
        jwt: jwtToken, // JWT token is required for all users
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinConfig: { enabled: false },
          prejoinPageEnabled: false,
          // Require authentication for all users
          authenticationRequired: true,
          passwordRequired: false,
          guestDialOutEnabled: false,
          enableClosePage: false,
          // Disable moderator indicators for cleaner interface
          disableModeratorIndicator: false,
          startAudioOnly: false
        },
        interfaceConfigOverwrite: {
          // Show pre-join page for authentication
          SHOW_PREJOIN_PAGE: true,
          SHOW_WELCOME_PAGE: false,
          // Enable chat functionality
          DISABLE_CHAT: false,
          HIDE_CHAT_BUTTON: false,
          // Hide Jitsi branding
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          // Custom branding
          APP_NAME: 'BibleNOW Studio',
          NATIVE_APP_NAME: 'BibleNOW Studio',
          PROVIDER_NAME: 'BibleNOW Studio',
          PRIMARY_COLOR: '#D97706',
          BRAND_COLOR: '#D97706',
          // Interface settings
          TOOLBAR_ALWAYS_VISIBLE: true
        }
      };

      try {
        // Use custom Jitsi server
        console.log('Initializing Jitsi Meet with options:', {
          roomName: options.roomName,
          jwt: options.jwt ? 'PRESENT' : 'MISSING',
          domain: jitsiConfig.domain,
          userInfo: options.userInfo
        });
        console.log('Jitsi domain:', jitsiConfig.domain);
        apiRef.current = new window.JitsiMeetExternalAPI(jitsiConfig.domain, options);
        console.log('Jitsi instance created:', apiRef.current);
        
        // Set ready immediately after instance creation
        console.log('Setting Jitsi ready immediately after instance creation');
        setIsJitsiReady(true);

        // Ensure iframe has required permissions
        console.log('Looking for Jitsi iframe...');
        const iframe = containerRef.current?.querySelector('iframe');
        console.log('Found iframe:', iframe);
        
        if (iframe) {
          console.log('Setting iframe permissions and onload handler');
          iframe.setAttribute('allow', 'camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen');
          
          // Set ready when iframe loads
          iframe.onload = () => {
            console.log('Jitsi iframe loaded - setting ready');
            setIsJitsiReady(true);
          };
        } else {
          console.log('No iframe found, will check again in 1 second');
          // Check again after a delay
          setTimeout(() => {
            const delayedIframe = containerRef.current?.querySelector('iframe');
            console.log('Delayed iframe check:', delayedIframe);
            if (delayedIframe) {
              delayedIframe.onload = () => {
                console.log('Delayed Jitsi iframe loaded - setting ready');
                setIsJitsiReady(true);
              };
            }
          }, 1000);
        }
        
        // Set up event listeners
        apiRef.current.on('readyToClose', () => {
          console.log('Jitsi readyToClose event');
          handleStreamEnd();
        });

        // API ready event
        apiRef.current.on('apiReady', () => {
          console.log('Jitsi API is ready');
          setIsJitsiReady(true);
        });

        apiRef.current.on('videoConferenceJoined', () => {
          console.log('User joined video conference');
          setIsJitsiReady(true);
        });

        // Additional events to track when Jitsi is ready
        apiRef.current.on('participantJoined', () => {
          console.log('Participant joined - Jitsi should be ready');
          setIsJitsiReady(true);
        });

        apiRef.current.on('participantLeft', () => {
          console.log('Participant left');
        });

        // Fallback: Set ready after a delay if no events fire
        setTimeout(() => {
          if (!isJitsiReady) {
            console.log('Fallback: Setting Jitsi ready after timeout');
            setIsJitsiReady(true);
          }
        }, 5000);

        // Minimal listeners per docs (no forced permission handling)

        apiRef.current.on('videoConferenceLeft', () => {
          console.log('User left video conference');
          setIsJitsiReady(false);
          handleStreamEnd();
        });



        apiRef.current.on('screenSharingStatusChanged', (event: any) => {
          setIsScreenSharing(!!event?.on);
        });

        // Track media stream events
        apiRef.current.on('audioMuteStatusChanged', (event: any) => {
          console.log('Audio mute status changed:', event);
          setIsAudioMuted(!!event?.muted);
        });

        apiRef.current.on('videoMuteStatusChanged', (event: any) => {
          console.log('Video mute status changed:', event);
          setIsVideoMuted(!!event?.muted);
        });

        // Track when media streams are actually started
        apiRef.current.on('mediaSessionStarted', () => {
          console.log('Media session started - camera and mic should be working');
        });

        apiRef.current.on('mediaSessionStopped', () => {
          console.log('Media session stopped');
        });

        // Handle media permission events
        apiRef.current.on('mediaPermissionRequested', () => {
          console.log('Media permission requested');
        });

        apiRef.current.on('mediaPermissionGranted', () => {
          console.log('Media permission granted');
        });

        apiRef.current.on('mediaPermissionDenied', () => {
          console.log('Media permission denied');
        });

        // Handle media session events
        apiRef.current.on('mediaSessionStarted', () => {
          console.log('Media session started - camera and mic should be working');
        });

        apiRef.current.on('mediaSessionStopped', () => {
          console.log('Media session stopped');
        });

        // Handle device events
        apiRef.current.on('deviceListChanged', (devices: any) => {
          console.log('Device list changed:', devices);
        });

        apiRef.current.on('audioDeviceChanged', (device: any) => {
          console.log('Audio device changed:', device);
        });

        apiRef.current.on('videoDeviceChanged', (device: any) => {
          console.log('Video device changed:', device);
        });



        // Handle connection events
        apiRef.current.on('connectionEstablished', () => {
          console.log('Connection established');
        });

        apiRef.current.on('connectionInterrupted', () => {
          console.log('Connection interrupted');
        });

        apiRef.current.on('connectionRestored', () => {
          console.log('Connection restored');
        });

        // Handle participant events
        apiRef.current.on('participantJoined', (participant: any) => {
          console.log('Participant joined:', participant);
          setParticipants(prev => [...prev, participant]);
        });

        apiRef.current.on('participantLeft', (participant: any) => {
          console.log('Participant left:', participant);
          setParticipants(prev => prev.filter(p => p.id !== participant.id));
          // Remove from moderators if they leave
          setModerators(prev => prev.filter(id => id !== participant.id));
        });

        // Handle moderator events
        apiRef.current.on('moderatorChanged', (event: any) => {
          console.log('Moderator changed:', event);
          if (event.id && event.moderator) {
            setModerators(prev => [...prev, event.id]);
          } else if (event.id) {
            setModerators(prev => prev.filter(id => id !== event.id));
          }
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
        try {
          apiRef.current.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi instance on cleanup:', error);
        }
        apiRef.current = null;
      }
    };
  }, [user, roomName, handleStreamEnd]);

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

    console.log('Sending message to room:', roomName, 'Message:', newMessage);
    setIsLoading(true);
    setError(null);

    try {
      await supabaseChatService.sendMessage(roomName, newMessage, false, streamData.hostAvatar || undefined);
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
    if (!isJitsiReady) {
      console.log('Jitsi not ready yet, waiting...');
      return;
    }
    
    try { 
      if (apiRef.current && apiRef.current.executeCommand) {
        console.log('Executing toggleAudio command');
        apiRef.current.executeCommand('toggleAudio'); 
      } else {
        console.error('Jitsi API not ready for toggleAudio');
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  const handleToggleVideo = () => {
    if (!isJitsiReady) {
      console.log('Jitsi not ready yet, waiting...');
      return;
    }
    
    try { 
      if (apiRef.current && apiRef.current.executeCommand) {
        console.log('Executing toggleVideo command');
        apiRef.current.executeCommand('toggleVideo'); 
      } else {
        console.error('Jitsi API not ready for toggleVideo');
      }
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const handleToggleShare = () => {
    if (!isJitsiReady) {
      console.log('Jitsi not ready yet, waiting...');
      return;
    }
    
    try { 
      if (apiRef.current && apiRef.current.executeCommand) {
        apiRef.current.executeCommand('toggleShareScreen'); 
      } else {
        console.error('Jitsi API not ready for toggleShare');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  };

  const handleHangup = () => {
    if (!isJitsiReady) {
      console.log('Jitsi not ready yet, waiting...');
      return;
    }
    
    try { 
      if (apiRef.current && apiRef.current.executeCommand) {
        apiRef.current.executeCommand('hangup'); 
      } else {
        console.error('Jitsi API not ready for hangup');
      }
    } catch (error) {
      console.error('Error hanging up:', error);
    }
    handleStreamEnd();
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



        {/* Top-left Branding Overlay */}
        <div className="absolute top-3 left-3 z-50 pointer-events-none">
          <div className="bg-black/40 rounded-md p-1">
            <img src="/logo172.png" alt="BibleNOW" className="h-8 md:h-10" />
          </div>
        </div>

        {/* Gift Burst Overlay */}
        {giftOverlay && (
          <GiftBurst amount={giftOverlay.amount} senderName={giftOverlay.sender} onDone={() => setGiftOverlay(null)} />
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

              {/* Custom Controls */}
              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleToggleAudio} 
                  title={isAudioMuted ? 'Unmute' : 'Mute'} 
                  className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all"
                >
                  {isAudioMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button 
                  onClick={handleToggleVideo} 
                  title={isVideoMuted ? 'Start camera' : 'Stop camera'} 
                  className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all"
                >
                  {isVideoMuted ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button 
                  onClick={handleToggleShare} 
                  title={isScreenSharing ? 'Stop sharing' : 'Share screen'} 
                  className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all"
                >
                  <ScreenShare className="w-6 h-6" />
                </button>
                <button onClick={() => setShowChat(!showChat)} title={showChat ? 'Hide chat' : 'Show chat'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  <MessageCircle className="w-6 h-6" />
                </button>
                {isStreamer && (
                  <button 
                    onClick={handleHangup} 
                    title="End stream" 
                    className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
                  >
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
          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && (
        <div className="w-80 border-l border-gray-700 flex flex-col h-full">
          {/* Moderator Management Panel */}
          {isModerator && (
            <div className="p-4 border-b border-yellow-500 bg-gray-800">
              <h3 className="text-white font-semibold mb-2">Moderator Panel</h3>
              <div className="space-y-2">
                <p className="text-gray-300 text-sm">Participants:</p>
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                    <span className="text-white text-sm">{participant.displayName || 'Unknown'}</span>
                    {!moderators.includes(participant.id) && (
                      <button
                        onClick={() => appointModerator(participant.id)}
                        className="px-2 py-1 bg-yellow-500 text-black text-xs rounded hover:bg-yellow-600"
                      >
                        Make Moderator
                      </button>
                    )}
                    {moderators.includes(participant.id) && (
                      <span className="text-yellow-400 text-xs">Moderator</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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