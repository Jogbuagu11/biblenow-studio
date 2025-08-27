import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageCircle, Maximize2, Minimize2, CheckCircle, Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Users } from 'lucide-react';
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
  const [showParticipants, setShowParticipants] = useState(false);
  
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
  const [debugInfo, setDebugInfo] = useState<{
    roomName: string;
    jwtToken: string | null;
    domain: string;
    userInfo: any;
  } | null>(null);

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

  // Appoint moderator function (only for streamer/host)
  const appointModerator = useCallback((participantId: string) => {
    // Only the streamer/host can appoint moderators, not other moderators
    if (apiRef.current && isStreamer) {
      try {
        apiRef.current.executeCommand('setModerator', participantId);
        console.log('Appointed moderator:', participantId);
      } catch (error) {
        console.error('Error appointing moderator:', error);
      }
    } else {
      console.warn('Only the streamer can appoint moderators');
    }
  }, [isStreamer]);

  // Kick participant function
  const kickParticipant = useCallback((participantId: string) => {
    if (apiRef.current && isModerator) {
      try {
        apiRef.current.executeCommand('kickParticipant', participantId);
        console.log('Kicked participant:', participantId);
      } catch (error) {
        console.error('Error kicking participant:', error);
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
  }, [roomName, user?.uid, user?.displayName]);

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
        apiRef.current.dispose();
        apiRef.current = null;
      }

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Get JWT token for custom Jitsi server - required for all users
      let jwtToken: string | null = null;
      let iframeRoomPath = roomName; // Default to roomName
      
      if (user) {
        try {
          // Check if user exists in either verified_profiles or profiles table
          let userProfile = null;
          
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
          
          // If user is not found in either table, continue anyway
          if (!userProfile) {
            console.warn('User not found in any profile table, continuing as guest');
          }
          
          // Check if this is the first user to join (moderator)
          // Only users from verified_profiles table can be moderators
          // The first user who creates the stream becomes the moderator
          const isFromVerifiedProfiles = userProfile && 'subscription_plan' in userProfile;
          const moderatorStatus = isStreamer && isFromVerifiedProfiles;
          setIsModerator(moderatorStatus);
          
          console.log('User profile found, moderator status:', moderatorStatus ? 'MODERATOR' : 'VIEWER');
          console.log('User table:', isFromVerifiedProfiles ? 'verified_profiles' : 'profiles');
          
          // Generate JWT token for authenticated users (required)
          if (user?.email) {
            try {
              console.log('Generating JWT token for room:', roomName, 'moderator:', moderatorStatus);
              const jwtAuthService = await import('../services/jwtAuthService');
              jwtToken = await jwtAuthService.default.generateJitsiToken(
                {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || 'BibleNOW User'
                },
                roomName,
                moderatorStatus
              );
              
              if (jwtToken) {
                console.log('✅ JWT token generated successfully');
                console.log('Token length:', jwtToken.length, 'characters');
              } else {
                console.error('❌ JWT token generation failed - authentication required');
                setError('Authentication failed. Please try logging in again.');
                // Redirect to login after a delay
                setTimeout(() => {
                  window.location.href = '/login';
                }, 3000);
                return;
              }
            } catch (e) {
              console.error('❌ JWT token generation error:', e instanceof Error ? e.message : String(e));
              setError('Authentication error. Please try logging in again.');
              // Redirect to login after a delay
              setTimeout(() => {
                window.location.href = '/login';
              }, 3000);
              return;
            }
          } else {
            console.error('No user email available - authentication required');
            setError('Authentication required. Please log in to join the livestream.');
            // Redirect to login after a delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 3000);
            return;
          }
          
          // Log the final JWT token status
          console.log('Final JWT token status:', jwtToken ? 'AVAILABLE' : 'NOT AVAILABLE');
          
          // Ensure JWT token is properly set
          if (!jwtToken) {
            console.log('No JWT token available, proceeding without authentication');
          } else {
            // Decode JWT to verify room name matches
            try {
              const tokenParts = jwtToken.split('.');
              if (tokenParts.length === 3) {
                const payloadBase64 = tokenParts[1];
                const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
                const jwtPayload = JSON.parse(payloadJson);
                
                // Verify room name in JWT matches the room name we're using
                if (jwtPayload.room && jwtPayload.room !== roomName) {
                  console.warn('Room name mismatch - JWT room:', jwtPayload.room, 'URL room:', roomName);
                  // Use the room name from JWT to ensure consistency
                  iframeRoomPath = jwtPayload.room;
                } else {
                  console.log('Room names match - JWT room:', jwtPayload.room, 'URL room:', roomName);
                  iframeRoomPath = roomName;
                }
              }
            } catch (error) {
              console.error('Error decoding JWT for room verification:', error);
              iframeRoomPath = roomName;
            }
          }
        } catch (error) {
          console.error('Error checking user verification status:', error);
          // Continue without user verification
          console.warn('Continuing without user verification...');
        }
      } else {
        // No user authenticated, continue as anonymous
        console.log('No authenticated user found, continuing as anonymous');
      }

      const options = {
        roomName: iframeRoomPath,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        jwt: jwtToken, // JWT token is required for authentication
        userInfo: {
          displayName: user?.displayName || "BibleNOW User",
          email: user?.email || "user@biblenowstudio.com"
        },
        configOverwrite: {
          // Authentication settings
          authenticationRequired: false, // Disable auth dialog since we have JWT
          passwordRequired: false, // Disable password requirement
          
          // Camera and microphone settings
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          startSilent: false,
          startAudioOnly: false,
          
          // Pre-join page settings
          prejoinPageEnabled: false,
          prejoinConfig: {
            enabled: false,
            hideGuestDialOut: true
          },
          
          // Other settings
          guestDialOutEnabled: false,
          enableClosePage: false,
          disableModeratorIndicator: false,
          requireDisplayName: false,
          enableWelcomePage: false
        },
        interfaceConfigOverwrite: {
          SHOW_PREJOIN_PAGE: false,
          SHOW_WELCOME_PAGE: false,
          DISABLE_CHAT: false,
          HIDE_CHAT_BUTTON: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          SHOW_CLOSE_PAGE: false,
          APP_NAME: 'BibleNOW Studio',
          NATIVE_APP_NAME: 'BibleNOW Studio',
          PROVIDER_NAME: 'BibleNOW Studio',
          PRIMARY_COLOR: '#D97706',
          BRAND_COLOR: '#D97706',
          TOOLBAR_ALWAYS_VISIBLE: true
        }
      };

      try {
        // Log Jitsi initialization details
        console.log('🚀 Initializing Jitsi Meet with configuration:');
        console.log('   Domain:', jitsiConfig.domain);
        console.log('   Room:', options.roomName);
        console.log('   JWT Token:', options.jwt ? '✅ Present' : '❌ Missing');
        console.log('   Authentication Required:', options.configOverwrite.authenticationRequired);
        console.log('   User:', options.userInfo.displayName, `(${options.userInfo.email})`);
        console.log('   Moderator Status:', isModerator);
        try {
          // Create Jitsi instance with domain and options, similar to working example
          apiRef.current = new window.JitsiMeetExternalAPI(jitsiConfig.domain, options);
          console.log('Jitsi instance created successfully with domain:', jitsiConfig.domain);
        } catch (error) {
          console.error('Error initializing Jitsi Meet:', error);
          return;
        }
        
        // Set ready immediately after instance creation
        console.log('Setting Jitsi ready immediately after instance creation');
        setIsJitsiReady(true);

        // Ensure iframe has required permissions
        console.log('Looking for Jitsi iframe...');
        const iframe = containerRef.current?.querySelector('iframe');
        console.log('Found iframe:', iframe);
        
        if (iframe) {
          console.log('Setting iframe permissions and onload handler');
          iframe.setAttribute('allow', 'camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen; geolocation');
          iframe.setAttribute('allowfullscreen', 'true');
          
          // Set ready when iframe loads
          iframe.onload = () => {
            console.log('Jitsi iframe loaded - setting ready');
            setIsJitsiReady(true);
            
            // Request camera permissions after iframe loads
            setTimeout(() => {
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                  .then(() => {
                    console.log('✅ Camera and microphone permissions granted');
                  })
                  .catch((error) => {
                    console.warn('⚠️ Camera/microphone permission denied:', error);
                  });
              }
            }, 1000);
          };
        } else {
          console.log('No iframe found, will check again in 1 second');
          // Check again after a delay
          setTimeout(() => {
            const delayedIframe = containerRef.current?.querySelector('iframe');
            console.log('Delayed iframe check:', delayedIframe);
            if (delayedIframe) {
              delayedIframe.setAttribute('allow', 'camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen; geolocation');
              delayedIframe.setAttribute('allowfullscreen', 'true');
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

        // Add authentication event handlers
        apiRef.current.on('authenticationRequired', () => {
          console.log('Jitsi authentication required - JWT should handle this automatically');
          // The JWT token should automatically authenticate
        });

        apiRef.current.on('passwordRequired', () => {
          console.log('Jitsi password required - this should not happen with JWT auth');
          setError('Password authentication is not supported. Please use JWT authentication.');
        });

        // Add error handling for connection failures
        apiRef.current.on('conferenceFailed', (event: any) => {
          console.error('Jitsi conference failed:', event);
          console.error('Error details:', {
            error: event.error,
            message: event.message,
            room: roomName,
            jwtPresent: !!jwtToken
          });
          
          // Capture debug info for troubleshooting
          setDebugInfo({
            roomName,
            jwtToken,
            domain: jitsiConfig.domain,
            userInfo: {
              displayName: user?.displayName,
              email: user?.email,
              isModerator
            }
          });
          
          // Check for specific authentication errors
          if (event.error === 'conference.authentication.failed' || 
              event.message?.includes('authentication') ||
              event.message?.includes('not allowed')) {
            setError('Authentication failed. Please log in again to join the livestream.');
            // Redirect to login after a delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 3000);
          } else {
            // Show user-friendly error message for other errors
            setError(`Connection failed: ${event.error || 'Unknown error'}. Please try refreshing the page.`);
          }
        });

        apiRef.current.on('connectionEstablished', () => {
          console.log('Jitsi connection established successfully');
        });

        apiRef.current.on('connectionInterrupted', () => {
          console.log('Jitsi connection interrupted');
        });

        apiRef.current.on('connectionRestored', () => {
          console.log('Jitsi connection restored');
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
  }, [user, roomName, handleStreamEnd, isJitsiReady, isStreamer, isModerator]);

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
          <div className="bg-black rounded-md p-2 shadow-lg">
            <img src="/logo172.png" alt="BibleNOW" className="h-8 md:h-10" />
          </div>
        </div>

        {/* Gift Burst Overlay */}
        {giftOverlay && (
          <GiftBurst amount={giftOverlay.amount} senderName={giftOverlay.sender} onDone={() => setGiftOverlay(null)} />
        )}
        
        {/* Stream Info Overlay */}
        <div className="absolute left-0 right-0 bottom-0 z-10">
          <div className="bg-amber-950 p-4 border-t border-amber-800 pointer-events-auto shadow-lg">
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
                <button onClick={() => setShowParticipants(!showParticipants)} title={showParticipants ? 'Hide participants' : 'Show participants'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  <Users className="w-6 h-6" />
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
              
              {/* Debug Information for Jitsi Issues */}
              {debugInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-yellow-300 hover:text-yellow-200">
                    🔧 Debug Information (Click to expand)
                  </summary>
                  <div className="mt-2 p-2 bg-gray-800 rounded text-xs font-mono">
                    <div><strong>Room Name:</strong> {debugInfo.roomName}</div>
                    <div><strong>Domain:</strong> {debugInfo.domain}</div>
                    <div><strong>JWT Token:</strong> {debugInfo.jwtToken ? 'Present' : 'Missing'}</div>
                    <div><strong>User:</strong> {debugInfo.userInfo.displayName} ({debugInfo.userInfo.email})</div>
                    <div><strong>Moderator:</strong> {debugInfo.userInfo.isModerator ? 'Yes' : 'No'}</div>
                    {debugInfo.jwtToken && (
                      <div className="mt-1">
                        <strong>JWT Preview:</strong> {debugInfo.jwtToken.substring(0, 50)}...
                      </div>
                    )}
                  </div>
                </details>
              )}
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

      {/* Participants Panel */}
      {showParticipants && (
        <div className="w-80 border-l border-gray-700 flex flex-col h-full bg-gray-900">
          
          {/* Participants Header */}
          <div className="p-4 border-b border-yellow-500 bg-gray-800">
            <h3 className="text-white font-semibold">Participants ({participants.length + 1})</h3>
          </div>

          {/* Participants List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Host/Streamer */}
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center overflow-hidden">
                  {streamData.hostAvatar ? (
                    <img 
                      src={streamData.hostAvatar} 
                      alt={streamData.hostName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold">
                      {streamData.hostName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{streamData.hostName}</span>
                    <CheckCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs bg-amber-500 text-black px-2 py-1 rounded">Host</span>
                  </div>
                  <span className="text-gray-400 text-sm">Streamer</span>
                </div>
              </div>
            </div>

            {/* Other Participants */}
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {participant.displayName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">
                        {participant.displayName || 'Unknown User'}
                      </span>
                      {moderators.includes(participant.id) && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Moderator</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-sm">Viewer</span>
                  </div>
                </div>
                
                {/* Moderator Controls */}
                {isModerator && participant.id !== user?.uid && (
                  <div className="flex space-x-2">
                    {/* Only streamer can appoint moderators */}
                    {isStreamer && (
                      <button
                        onClick={() => appointModerator(participant.id)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        title="Make Moderator"
                      >
                        👑
                      </button>
                    )}
                    {/* Moderators can kick participants */}
                    <button
                      onClick={() => kickParticipant(participant.id)}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      title="Kick Participant"
                    >
                      🚫
                    </button>
                  </div>
                )}
              </div>
            ))}

            {participants.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p>No other participants yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStream;