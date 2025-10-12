import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageCircle, Maximize2, Minimize2, CheckCircle, Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Users } from 'lucide-react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';
import { supabaseChatService, ChatMessage } from '../services/supabaseChatService';
import { supabase } from '../config/supabase';
import { jitsiConfig } from '../config/jitsi';
import { RoomUrlService } from '../services/roomUrlService';
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
  const rawRoomName = RoomUrlService.parseRoomFromUrl() || propRoomName || 'biblenow-app/bible-study';
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
  const isInitializingRef = useRef<boolean>(false);
  
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

  // Manual camera recovery function
  const recoverCamera = useCallback(() => {
    if (apiRef.current) {
      console.log('🔄 Manual camera recovery initiated...');
      
      // First, try to toggle video off and on
      apiRef.current.executeCommand('toggleVideo');
      setTimeout(() => {
        if (apiRef.current) {
          apiRef.current.executeCommand('toggleVideo');
          console.log('🔄 Camera toggled off and on');
        }
      }, 1000);
      
      // If that doesn't work, try to reinitialize camera
      setTimeout(() => {
        if (apiRef.current) {
          apiRef.current.executeCommand('toggleVideo');
          console.log('🔄 Final camera toggle attempt');
        }
      }, 3000);
    }
  }, []);

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
      // Prevent multiple initializations
      if (apiRef.current || isInitializingRef.current) {
        console.log('🔍 [LiveStream] Jitsi already initialized or initializing, skipping...');
        return;
      }
      
      isInitializingRef.current = true;
      console.log('🔍 [LiveStream] Starting Jitsi initialization...');
      
      // Clean up any existing instance (extra safety)
      if (apiRef.current) {
        console.log('🔍 [LiveStream] Cleaning up existing Jitsi instance...');
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
                console.log('⚠️ JWT authentication disabled - proceeding with anonymous access');
                // Continue without JWT token - this is expected when JWT is disabled
              }
            } catch (e) {
              console.warn('⚠️ JWT token generation error (continuing with anonymous access):', e instanceof Error ? e.message : String(e));
              // Continue without JWT token - this is expected when JWT is disabled
            }
          } else {
            console.log('⚠️ No user email available - proceeding with anonymous access');
            // Continue without user authentication - this allows anonymous access
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
        jwt: jwtToken || undefined, // JWT token is optional when authentication is disabled
        userInfo: {
          displayName: user?.displayName || "BibleNOW User",
          email: user?.email || "user@biblenowstudio.com"
        },
        configOverwrite: {
          // Authentication settings - DISABLE JWT AUTHENTICATION
          authenticationRequired: false,
          passwordRequired: false,
          enableInsecureRoomNameWarning: false,
          
          // Different settings for streamers vs viewers
          startWithAudioMuted: isStreamer ? false : true, // Streamers start with audio, viewers muted
          startWithVideoMuted: isStreamer ? false : true, // Streamers start with video, viewers muted
          startSilent: isStreamer ? false : true, // Streamers not silent, viewers silent
          startAudioOnly: false,
          
          // CRITICAL: Disable pre-join page completely for both streamers and viewers
          prejoinPageEnabled: false, // Disable pre-join page completely
          prejoinConfig: {
            enabled: false,
            hideGuestDialOut: true,
            hideDisplayName: true,
            hidePrejoinDisplayName: true
          },
          
          // CRITICAL: Remove restrictive media constraints
          // Let Jitsi handle media constraints automatically
          
          // Basic settings
          guestDialOutEnabled: false,
          enableClosePage: false,
          disableModeratorIndicator: false,
          requireDisplayName: false,
          enableWelcomePage: false,
          
          // CRITICAL: Ensure video layer is not suspended
          enableLayerSuspension: false,
          disablePolls: false,
          disableReactions: false,
          
          // Network settings
          enableNoisyMicDetection: false, // Disable to avoid audio issues
          enableTalkWhileMuted: false,
          enableNoAudioDetection: false, // Disable to avoid detection issues
          
          // CRITICAL: Ensure video quality is not restricted
          videoQuality: {
            maxBitrate: 5000000, // Increase bitrate
            maxFramerate: 60 // Increase framerate
          },
          
          // CRITICAL: Force video to be enabled
          defaultLocalDisplayName: user?.displayName || "BibleNOW User",
          enableRemb: true, // Enable bandwidth adaptation
          enableTcc: true, // Enable transport congestion control
          
          // CRITICAL: Ensure video is not blocked by any settings
          disableRemoteMute: false,
          enableLipSync: true
        },
        interfaceConfigOverwrite: {
          // Completely disable pre-join screen
          SHOW_PREJOIN_PAGE: false,
          SHOW_WELCOME_PAGE: false,
          DISABLE_PREJOIN_UI: true,
          
          // Chat and UI settings
          DISABLE_CHAT: false,
          HIDE_CHAT_BUTTON: false,
          
          // Hide Jitsi branding
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          SHOW_CLOSE_PAGE: false,
          
          // App branding
          APP_NAME: 'BibleNOW Studio',
          NATIVE_APP_NAME: 'BibleNOW Studio',
          PROVIDER_NAME: 'BibleNOW Studio',
          PRIMARY_COLOR: '#D97706',
          BRAND_COLOR: '#D97706',
          
          // UI behavior
          TOOLBAR_ALWAYS_VISIBLE: true,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          DISABLE_PRESENCE_STATUS: true
        }
      };

      try {
        // Enhanced debugging for video feed issues
        console.log('🎥 Starting Jitsi initialization with enhanced debugging...');
        console.log('📊 Initialization parameters:', {
          roomName: iframeRoomPath,
          jwtToken: jwtToken ? 'Present' : 'Missing',
          user: user ? { uid: user.uid, email: user.email } : 'Anonymous',
          container: containerRef.current ? 'Found' : 'Missing',
          isStreamer: isStreamer,
          permissionStrategy: isStreamer ? 'Request camera/mic (streamer)' : 'No permissions (viewer)',
          prejoinPageEnabled: false,
          startWithVideoMuted: isStreamer ? false : true,
          startWithAudioMuted: isStreamer ? false : true
        });
        
        // CRITICAL: Pre-request camera permissions for streamers BEFORE Jitsi initializes
        if (isStreamer) {
          console.log('🎥 PRE-INIT: Requesting camera permissions for streamer...');
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: true
            });
            console.log('✅ PRE-INIT: Camera access granted!');
            console.log('📹 Video tracks:', stream.getVideoTracks().length);
            console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
            
            // Don't stop the stream - let Jitsi reuse it
            // stream.getTracks().forEach(track => track.stop());
            console.log('✅ PRE-INIT: Keeping stream active for Jitsi to use');
          } catch (error) {
            console.error('❌ PRE-INIT: Failed to get camera permissions:', error);
            // Continue anyway - Jitsi will request permissions
          }
        }
        
        // Check container dimensions
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          console.log('📐 Container dimensions:', {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            visible: rect.width > 0 && rect.height > 0
          });
        }
        
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
          console.log('🔧 Creating Jitsi API instance with enhanced debugging...');
          apiRef.current = new window.JitsiMeetExternalAPI(jitsiConfig.domain, options);
          console.log('✅ Jitsi instance created successfully with domain:', jitsiConfig.domain);
          
          // Store reference for debugging
          if (containerRef.current) {
            (containerRef.current as any)._jitsiAPI = apiRef.current;
          }
          
          // Add comprehensive event listeners for debugging
          apiRef.current.addListener('videoConferenceJoined', () => {
            console.log('🎉 Video conference joined successfully');
            setIsJitsiReady(true);
            
            // CRITICAL: Immediately request camera access and force video on
            if (apiRef.current && isStreamer) {
              console.log('🎥 IMMEDIATE: Requesting camera for streamer...');
              
              // Immediately try to enable video (no delay)
              try {
                apiRef.current.executeCommand('toggleVideo', false); // false = unmute video
                console.log('✅ IMMEDIATE: Video unmute command sent');
              } catch (error) {
                console.error('❌ IMMEDIATE error forcing video:', error);
              }
              
              // Follow up with additional camera commands
              setTimeout(() => {
                if (apiRef.current) {
                  console.log('🎥 FOLLOW-UP: Forcing video to be enabled...');
                  try {
                    // Ensure video is not muted
                    apiRef.current.executeCommand('toggleVideo', false);
                    console.log('✅ FOLLOW-UP: Video unmuted command sent');
                    
                    // Set video quality
                    apiRef.current.executeCommand('setVideoQuality', 720);
                    console.log('✅ FOLLOW-UP: Video quality set to 720p');
                    
                  } catch (error) {
                    console.error('❌ FOLLOW-UP error forcing video:', error);
                  }
                }
              }, 1000);
            
            // Additional camera check after 5 seconds
            setTimeout(() => {
              if (apiRef.current) {
                console.log('🔍 Checking camera status after 5 seconds...');
                try {
                  // Check if video is still muted
                  const isVideoMuted = apiRef.current.isVideoMuted();
                  console.log('📹 Video muted status:', isVideoMuted);
                  
                  if (isVideoMuted) {
                    console.log('🔄 Video is muted, attempting to unmute...');
                    apiRef.current.executeCommand('toggleVideo', false);
                  }
                  
                  // Check participant info
                  const participants = apiRef.current.getParticipantsInfo();
                  console.log('👥 Participants:', participants);
                  
                } catch (error) {
                  console.error('❌ Error checking camera status:', error);
                }
              }
            }, 5000);
            }
          });
          
          apiRef.current.addListener('videoConferenceLeft', () => {
            console.log('👋 Video conference left');
            setIsJitsiReady(false);
          });
          
          apiRef.current.addListener('participantJoined', (participant: any) => {
            console.log('👤 Participant joined:', participant);
          });
          
          apiRef.current.addListener('participantLeft', (participant: any) => {
            console.log('👋 Participant left:', participant);
          });
          
          apiRef.current.addListener('videoMuteStatusChanged', (data: any) => {
            console.log('📹 Video mute status changed:', data);
            setIsVideoMuted(data.muted);
            
            // CRITICAL: If video is muted, try to unmute it immediately
            if (data.muted && isStreamer) {
              console.log('🚨 Video was muted - attempting to unmute immediately...');
              setTimeout(() => {
                if (apiRef.current) {
                  try {
                    apiRef.current.executeCommand('toggleVideo', false);
                    console.log('🔄 Attempted to unmute video');
                  } catch (error) {
                    console.error('❌ Error unmuting video:', error);
                  }
                }
              }, 1000);
            }
            
            // If camera was unmuted but we're not getting video, try to re-enable
            if (!data.muted && isStreamer) {
              console.log('🎥 Camera unmuted - checking video feed...');
              setTimeout(() => {
                // Check if we have active video tracks
                navigator.mediaDevices.getUserMedia({ video: true })
                  .then(stream => {
                    console.log('✅ Video stream active:', stream.getVideoTracks().length > 0);
                    stream.getTracks().forEach(track => track.stop()); // Stop the test stream
                  })
                  .catch(error => {
                    console.warn('⚠️ Video stream check failed:', error);
                  });
              }, 2000);
            }
          });
          
          apiRef.current.addListener('audioMuteStatusChanged', (data: any) => {
            console.log('🎤 Audio mute status changed:', data);
            setIsAudioMuted(data.muted);
          });
          
          apiRef.current.addListener('readyToClose', () => {
            console.log('🚪 Ready to close');
          });
          
          apiRef.current.addListener('error', (error: any) => {
            console.error('❌ Jitsi error:', error);
          });
          
          // Add camera-specific event listeners
          apiRef.current.addListener('cameraError', (error: any) => {
            console.error('📹 Camera error:', error);
            // Try to recover from camera error
            if (isStreamer) {
              console.log('🔄 Attempting camera recovery...');
              setTimeout(() => {
                apiRef.current?.executeCommand('toggleVideo');
              }, 3000);
            }
          });
          
          apiRef.current.addListener('deviceListChanged', (devices: any) => {
            console.log('📱 Device list changed:', devices);
          });
          
          // Add listener for when video track is added
          apiRef.current.addListener('videoTrackAdded', (track: any) => {
            console.log('🎥 Video track added:', track);
            console.log('✅ Camera feed should now be visible!');
          });
          
          // Add listener for when video track is removed
          apiRef.current.addListener('videoTrackRemoved', (track: any) => {
            console.log('❌ Video track removed:', track);
            console.log('⚠️ Camera feed lost!');
          });
          
          apiRef.current.addListener('mediaSessionStarted', () => {
            console.log('🎥 Media session started');
          });
          
          apiRef.current.addListener('mediaSessionStopped', () => {
            console.log('🛑 Media session stopped');
          });
          
        } catch (error) {
          console.error('❌ Error initializing Jitsi Meet:', error);
          console.error('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : 'Unknown'
          });
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
          console.log('🔧 Setting iframe permissions and onload handler');
          iframe.setAttribute('allow', 'camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen; geolocation');
          iframe.setAttribute('allowfullscreen', 'true');
          
          // Enhanced iframe debugging
          console.log('📐 Iframe details:', {
            src: iframe.src,
            width: iframe.offsetWidth,
            height: iframe.offsetHeight,
            display: getComputedStyle(iframe).display,
            visibility: getComputedStyle(iframe).visibility,
            position: getComputedStyle(iframe).position
          });
          
          // Set ready when iframe loads
          iframe.onload = () => {
            console.log('✅ Jitsi iframe loaded successfully');
            console.log('📊 Iframe load time:', performance.now());
            setIsJitsiReady(true);
            
            // Check for video elements after iframe loads
            setTimeout(() => {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                  const videoElements = iframeDoc.querySelectorAll('video');
                  if (videoElements && videoElements.length > 0) {
                    console.log('📹 Video elements found in iframe:', videoElements.length);
                    videoElements.forEach((video, index) => {
                      console.log(`Video ${index + 1}:`, {
                        src: video.src,
                        readyState: video.readyState,
                        paused: video.paused,
                        muted: video.muted,
                        videoWidth: video.videoWidth,
                        videoHeight: video.videoHeight
                      });
                    });
                  } else {
                    console.log('❌ No video elements found in iframe');
                  }
                } else {
                  console.log('⚠️ Cannot access iframe content (cross-origin)');
                }
              } catch (error) {
                console.log('⚠️ Cannot access iframe content:', error instanceof Error ? error.message : String(error));
              }
            }, 3000);
            
            // Let Jitsi handle camera permissions internally
            // Don't request permissions outside of Jitsi context
            console.log('🎥 Camera permissions will be handled by Jitsi internally');
          };
          
          iframe.onerror = (error) => {
            console.error('❌ Iframe failed to load:', error);
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
      } finally {
        isInitializingRef.current = false;
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
      isInitializingRef.current = false;
    };
  }, [user, roomName]); // Only re-initialize when user or room changes

  // Handle stream end when isStreamer or isModerator changes
  useEffect(() => {
    if (apiRef.current && (isStreamer || isModerator)) {
      // Re-register stream end handler if needed
      apiRef.current.addListener('videoConferenceLeft', handleStreamEnd);
    }
  }, [isStreamer, isModerator, handleStreamEnd]);

  // Handle Jitsi ready state changes
  useEffect(() => {
    if (apiRef.current && isJitsiReady) {
      // Perform any actions needed when Jitsi becomes ready
      console.log('🔍 [LiveStream] Jitsi ready state changed, performing ready actions...');
    }
  }, [isJitsiReady]);

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