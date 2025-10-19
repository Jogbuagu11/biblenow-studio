import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageCircle, Maximize2, Minimize2, CheckCircle, Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Users, Square, Circle } from 'lucide-react';
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'starting' | 'recording' | 'stopping' | 'error'>('idle');
  const [recordingSupported, setRecordingSupported] = useState<boolean | null>(null);
  const [moderators, setModerators] = useState<string[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
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
  const appointModerator = useCallback(async (participantId: string) => {
    // Only the streamer/host can appoint moderators, not other moderators
    if (isStreamer) {
      try {
        // Add to moderators list in state
        setModerators(prev => {
          if (!prev.includes(participantId)) {
            return [...prev, participantId];
          }
          return prev;
        });
        
        // Also try Jitsi API command if available
        if (apiRef.current) {
          apiRef.current.executeCommand('setModerator', participantId);
        }
        
        console.log('Appointed moderator:', participantId);
      } catch (error) {
        console.error('Error appointing moderator:', error);
      }
    } else {
      console.warn('Only the streamer can appoint moderators');
    }
  }, [isStreamer]);

  // Kick participant function
  const kickParticipant = useCallback(async (participantId: string) => {
    if (isModerator) {
      try {
        // Mark viewer as inactive in database
        try {
          const { supabase } = await import('../config/supabase');
          
          // Get current stream ID
          const urlParams = new URLSearchParams(window.location.search);
          const roomParam = urlParams.get('room');
          
          if (roomParam) {
            const { data: streamData } = await supabase
              .from('livestreams')
              .select('id')
              .eq('room_name', roomParam)
              .eq('is_live', true)
              .single();
            
            if (streamData) {
              // Update viewer record to mark as left
              await supabase
                .from('livestream_viewers')
                .update({
                  left_at: new Date().toISOString(),
                  is_active: false
                })
                .eq('livestream_id', streamData.id)
                .eq('user_id', participantId);
            }
          }
        } catch (dbError) {
          console.error('Error updating database for kicked participant:', dbError);
        }
        
        // Remove from viewers list
        setViewers(prev => prev.filter(v => v.user_id !== participantId));
        
        // Remove from moderators if they were a moderator
        setModerators(prev => prev.filter(id => id !== participantId));
        
        // Also try Jitsi API command if available
        if (apiRef.current) {
          apiRef.current.executeCommand('kickParticipant', participantId);
        }
        
        console.log('Kicked participant:', participantId);
      } catch (error) {
        console.error('Error kicking participant:', error);
      }
    } else {
      console.warn('Only moderators can kick participants');
    }
  }, [isModerator]);

  // Track viewer in database
  const trackViewerJoin = useCallback(async (userId: string, livestreamId?: string) => {
    if (!user) return;
    
    try {
      const { supabase } = await import('../config/supabase');
      
      // If no livestreamId provided, try to get current stream
      let streamId = livestreamId;
      if (!streamId) {
        // Try to get current stream from URL or state
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        if (roomParam) {
          // Query for active stream with this room name
          const { data: streamData } = await supabase
            .from('livestreams')
            .select('id')
            .eq('room_name', roomParam)
            .eq('is_live', true)
            .single();
          
          if (streamData) {
            streamId = streamData.id;
          }
        }
      }
      
      if (streamId) {
        // Insert or update viewer record
        const { error } = await supabase
          .from('livestream_viewers')
          .upsert({
            livestream_id: streamId,
            user_id: userId,
            joined_at: new Date().toISOString(),
            is_active: true,
            left_at: null
          }, {
            onConflict: 'livestream_id,user_id'
          });
        
        if (error) {
          console.error('Error tracking viewer join:', error);
        } else {
          console.log('Viewer join tracked in database');
        }
      }
    } catch (error) {
      console.error('Error in trackViewerJoin:', error);
    }
  }, [user]);

  // Track viewer leaving
  const trackViewerLeave = useCallback(async (userId: string, livestreamId?: string) => {
    if (!user) return;
    
    try {
      const { supabase } = await import('../config/supabase');
      
      // If no livestreamId provided, try to get current stream
      let streamId = livestreamId;
      if (!streamId) {
        const urlParams = new URLSearchParams(window.location.search);
        const roomParam = urlParams.get('room');
        if (roomParam) {
          const { data: streamData } = await supabase
            .from('livestreams')
            .select('id')
            .eq('room_name', roomParam)
            .eq('is_live', true)
            .single();
          
          if (streamData) {
            streamId = streamData.id;
          }
        }
      }
      
      if (streamId) {
        // Update viewer record to mark as left
        const { error } = await supabase
          .from('livestream_viewers')
          .update({
            left_at: new Date().toISOString(),
            is_active: false
          })
          .eq('livestream_id', streamId)
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error tracking viewer leave:', error);
        } else {
          console.log('Viewer leave tracked in database');
        }
      }
    } catch (error) {
      console.error('Error in trackViewerLeave:', error);
    }
  }, [user]);

  // Fetch current viewers from database
  const fetchViewers = useCallback(async () => {
    try {
      const { supabase } = await import('../config/supabase');
      
      // Get current stream ID
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      
      console.log('Fetching viewers for room:', roomParam);
      
      if (roomParam) {
        // First, try to find the stream
        const { data: streamData, error: streamError } = await supabase
          .from('livestreams')
          .select('id, room_name, is_live')
          .eq('room_name', roomParam)
          .eq('is_live', true)
          .single();
        
        console.log('Stream query result:', { streamData, streamError });
        
        if (streamError) {
          console.error('Error finding stream:', streamError);
          return;
        }
        
        if (streamData) {
          console.log('Found stream with ID:', streamData.id);
          
          // Get active viewers (basic data first, then fetch profiles separately)
          const { data: viewersData, error: viewersError } = await supabase
            .from('livestream_viewers')
            .select('*')
            .eq('livestream_id', streamData.id)
            .eq('is_active', true)
            .order('joined_at', { ascending: true });
          
          // If we have viewers, fetch their profile information
          if (viewersData && viewersData.length > 0) {
            const userIds = viewersData.map(v => v.user_id).filter(Boolean);
            console.log('Viewer user IDs:', userIds);
            
            // Try to get profiles from verified_profiles first
            const { data: verifiedProfiles, error: verifiedError } = await supabase
              .from('verified_profiles')
              .select('id, first_name, last_name, profile_photo_url')
              .in('id', userIds);
            
            console.log('Verified profiles query result:', { verifiedProfiles, verifiedError });
            
            // If no verified profiles found, try profiles table
            let profiles = verifiedProfiles;
            if (!profiles || profiles.length === 0) {
              console.log('No verified profiles found, trying profiles table...');
              const { data: regularProfiles, error: regularError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, profile_photo_url')
                .in('id', userIds);
              
              console.log('Profiles table query result:', { regularProfiles, regularError });
              profiles = regularProfiles;
            }
            
            // Remove the user_id fallback since we're using id to id relationship
            
            // Merge viewer data with profile data
            const viewersWithProfiles = viewersData.map(viewer => {
              let profile = null;
              
              // Find profile by id (user_id in livestream_viewers matches id in profiles)
              if (profiles) {
                profile = profiles.find((p: any) => p.id === viewer.user_id);
              }
              
              console.log(`Profile for viewer ${viewer.user_id}:`, profile);
              
              return {
                ...viewer,
                profile
              };
            });
            
            console.log('Final viewers with profiles:', viewersWithProfiles);
            setViewers(viewersWithProfiles);
          } else {
            setViewers([]);
          }
          
          console.log('Viewers query result:', { viewersData, viewersError });
          
          if (viewersError) {
            console.error('Error fetching viewers:', viewersError);
          } else {
            console.log('Successfully fetched viewers:', viewersData);
            setViewers(viewersData || []);
          }
        } else {
          console.log('No active stream found for room:', roomParam);
        }
      } else {
        console.log('No room parameter found in URL');
      }
    } catch (error) {
      console.error('Error in fetchViewers:', error);
    }
  }, []);

  // Refresh participants function (now fetches from database)
  const refreshParticipants = useCallback(() => {
    fetchViewers();
  }, [fetchViewers]);

  // Track viewer leaving when component unmounts
  useEffect(() => {
    return () => {
      // Track viewer leaving when component unmounts
      if (user?.uid) {
        trackViewerLeave(user.uid);
      }
    };
  }, [user?.uid, trackViewerLeave]);

  // Periodically refresh viewers list
  useEffect(() => {
    if (isJitsiReady) {
      // Initial fetch
      fetchViewers();
      
      // Set up periodic refresh every 10 seconds
      const interval = setInterval(() => {
        fetchViewers();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [isJitsiReady, fetchViewers]);

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

  // Function to wait for Jitsi script to load
  const waitForJitsiScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      
      // Wait up to 10 seconds for script to load
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds with 100ms intervals
      
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.JitsiMeetExternalAPI) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('JitsiMeetExternalAPI script failed to load within 10 seconds'));
        }
      }, 100);
    });
  };

  // Initialize Jitsi
  useEffect(() => {
    const initializeJitsi = async () => {
      // Clean up any existing instance
      if (apiRef.current) {
        console.log('Cleaning up existing Jitsi instance');
        try {
          // Clear recording sync interval if it exists
          if ((apiRef.current as any)._recordingSyncInterval) {
            clearInterval((apiRef.current as any)._recordingSyncInterval);
            console.log('📊 Cleared recording sync interval');
          }
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

      // Wait for Jitsi script to load
      try {
        console.log('Waiting for Jitsi script to load...');
        await waitForJitsiScript();
        console.log('Jitsi script loaded successfully');
      } catch (error) {
        console.error('Failed to load Jitsi script:', error);
        return;
      }

      // JWT is disabled on server - proceed without JWT authentication
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
          
          // JWT is disabled on server - skip JWT token generation
          console.log('JWT authentication is disabled on server - proceeding without JWT token');
          jwtToken = null;
          
          // Log the final JWT token status
          console.log('Final JWT token status:', jwtToken ? 'AVAILABLE' : 'NOT AVAILABLE');
          
          // No JWT token needed - use room name directly
          console.log('No JWT authentication - using room name directly:', roomName);
          iframeRoomPath = roomName;
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
        // JWT authentication is disabled - no JWT token needed
        userInfo: {
          displayName: user?.displayName || "BibleNOW User",
          email: user?.email || "user@biblenowstudio.com"
        },
        configOverwrite: {
          // Authentication settings
          authenticationRequired: false, // Disable auth dialog
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
          
          // Recording settings for self-hosted Jitsi with Jibri
          recording: {
            enabled: true,
            mode: 'file', // or 'stream' or 'both'
            service: 'jibri'
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
          TOOLBAR_ALWAYS_VISIBLE: true,
          
          // Enable recording button in toolbar
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'chat', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone-else'
          ]
        }
      };

      try {
        // Log Jitsi initialization details
        console.log('🚀 Initializing Jitsi Meet with configuration:');
        console.log('   Domain:', jitsiConfig.domain);
        console.log('   Room:', options.roomName);
        console.log('   JWT Token:', '❌ Disabled (JWT authentication is turned off)');
        console.log('   Authentication Required:', options.configOverwrite.authenticationRequired);
        console.log('   User:', options.userInfo.displayName, `(${options.userInfo.email})`);
        console.log('   Moderator Status:', isModerator);
        try {
          // Verify JitsiMeetExternalAPI is available before creating instance
          if (typeof window.JitsiMeetExternalAPI !== 'function') {
            console.error('JitsiMeetExternalAPI is not available. Script may not be loaded properly.');
            console.log('Available window properties:', Object.keys(window).filter(key => key.includes('Jitsi')));
            return;
          }
          
          // Create Jitsi instance with domain and options, similar to working example
          apiRef.current = new window.JitsiMeetExternalAPI(jitsiConfig.domain, options);
          console.log('Jitsi instance created successfully with domain:', jitsiConfig.domain);
        } catch (error) {
          console.error('Error initializing Jitsi Meet:', error);
          return;
        }
        
        // Don't set ready immediately - wait for actual events
        console.log('Jitsi instance created, waiting for ready events...');

        // Ensure iframe has required permissions
        console.log('Looking for Jitsi iframe...');
        const iframe = containerRef.current?.querySelector('iframe');
        console.log('Found iframe:', iframe);
        
        if (iframe) {
          console.log('Setting iframe permissions and onload handler');
          iframe.setAttribute('allow', 'camera; microphone; display-capture; clipboard-read; clipboard-write; autoplay; fullscreen; geolocation');
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation');
          
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
              delayedIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation');
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
          
          // Check if recording is supported
          setTimeout(() => {
            try {
              if (apiRef.current && typeof apiRef.current.getAvailableCommands === 'function') {
                const commands = apiRef.current.getAvailableCommands();
                const supportsRecording = commands?.includes('toggleRecording');
                console.log('📊 Recording support check:', {
                  availableCommands: commands,
                  supportsRecording
                });
                setRecordingSupported(supportsRecording);
                
                // If recording is supported, start periodic state sync
                if (supportsRecording) {
                  console.log('📊 Starting periodic recording state sync');
                  const syncInterval = setInterval(() => {
                    if (apiRef.current && typeof apiRef.current.getRecordingState === 'function') {
                      try {
                        const recordingState = apiRef.current.getRecordingState();
                        if (recordingState !== isRecording) {
                          console.log('📊 Recording state changed via native button:', recordingState);
                          setIsRecording(recordingState);
                          setRecordingStatus(recordingState ? 'recording' : 'idle');
                        }
                      } catch (error) {
                        console.log('📊 Error syncing recording state:', error);
                      }
                    }
                  }, 2000); // Check every 2 seconds
                  
                  // Store interval ID for cleanup
                  (apiRef.current as any)._recordingSyncInterval = syncInterval;
                }
              } else {
                console.log('📊 Could not check recording support - getAvailableCommands not available');
                setRecordingSupported(false);
              }
            } catch (error) {
              console.log('📊 Error checking recording support:', error);
              setRecordingSupported(false);
            }
          }, 2000); // Wait 2 seconds for API to be fully ready
          
          // Set streamer as moderator
          if (isStreamer && user?.uid) {
            setModerators(prev => {
              if (!prev.includes(user.uid)) {
                return [...prev, user.uid];
              }
              return prev;
            });
            setIsModerator(true);
          }
          
          // Track current user joining the stream
          if (user?.uid) {
            trackViewerJoin(user.uid);
          }
          
          // Fetch current viewers from database
          fetchViewers();
        });

        apiRef.current.on('videoConferenceJoined', () => {
          console.log('User joined video conference');
          setIsJitsiReady(true);
          
          // Set streamer as moderator
          if (isStreamer && user?.uid) {
            setModerators(prev => {
              if (!prev.includes(user.uid)) {
                return [...prev, user.uid];
              }
              return prev;
            });
            setIsModerator(true);
          }
          
          // Track current user joining the stream
          if (user?.uid) {
            trackViewerJoin(user.uid);
          }
          
          // Fetch current viewers from database
          fetchViewers();
        });

        // Add authentication event handlers
        apiRef.current.on('authenticationRequired', () => {
          console.log('Jitsi authentication required - JWT should handle this automatically');
          // The JWT token should automatically authenticate
        });

        // Add error handling
        apiRef.current.on('error', (error: any) => {
          console.error('Jitsi error:', error);
          setError(`Jitsi error: ${error.message || 'Unknown error'}`);
        });

        // Add conference failed handler
        apiRef.current.on('conferenceFailed', (error: any) => {
          console.error('Conference failed:', error);
          setError(`Conference failed: ${error.message || 'Unknown error'}`);
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

        // Handle participant events (for Jitsi participants, but we track viewers in database)
        apiRef.current.on('participantJoined', (participant: any) => {
          console.log('Participant joined:', participant);
          setIsJitsiReady(true);
          
          // Refresh viewers from database when someone joins
          fetchViewers();
        });

        apiRef.current.on('participantLeft', (participant: any) => {
          console.log('Participant left:', participant);
          
          // Refresh viewers from database when someone leaves
          fetchViewers();
        });

        // Recording event handlers
        apiRef.current.on('recordingStatusChanged', (event: any) => {
          console.log('🎬 Recording status changed event received');
          console.log('📊 Event details:', {
            event,
            on: event?.on,
            mode: event?.mode,
            timestamp: new Date().toISOString()
          });
          
          if (event.on) {
            console.log('✅ Recording started successfully');
            setIsRecording(true);
            setRecordingStatus('recording');
          } else {
            console.log('⏹️ Recording stopped successfully');
            setIsRecording(false);
            setRecordingStatus('idle');
          }
        });

        // Listen for native recording button clicks
        apiRef.current.on('recordingButtonClicked', (event: any) => {
          console.log('🎬 Native recording button clicked');
          console.log('📊 Event details:', event);
          // The native button will handle the recording state, we just need to sync our UI
        });

        // Listen for toolbar button events
        apiRef.current.on('toolbarButtonClicked', (event: any) => {
          console.log('🔧 Toolbar button clicked:', event);
          if (event.buttonName === 'recording') {
            console.log('🎬 Native recording button clicked via toolbar');
            // Sync our state with the native button
            setTimeout(() => {
              if (apiRef.current && typeof apiRef.current.getRecordingState === 'function') {
                try {
                  const recordingState = apiRef.current.getRecordingState();
                  console.log('📊 Current recording state from native button:', recordingState);
                  setIsRecording(recordingState);
                  setRecordingStatus(recordingState ? 'recording' : 'idle');
                } catch (error) {
                  console.log('📊 Could not get recording state:', error);
                }
              }
            }, 1000); // Wait a bit for the state to update
          }
        });

        apiRef.current.on('recordingError', (error: any) => {
          console.error('💥 Recording error event received');
          console.error('📊 Error details:', {
            error,
            message: error?.message,
            code: error?.code,
            timestamp: new Date().toISOString()
          });
          setRecordingStatus('error');
          setIsRecording(false);
          setError(`Recording error: ${error.message || 'Unknown recording error'}`);
        });

        // Additional recording events for better error handling
        apiRef.current.on('recordingLinkAvailable', (event: any) => {
          console.log('🔗 Recording link available event');
          console.log('📊 Link details:', {
            event,
            link: event?.link,
            timestamp: new Date().toISOString()
          });
        });

        apiRef.current.on('recordingLinkReady', (event: any) => {
          console.log('🔗 Recording link ready event');
          console.log('📊 Link details:', {
            event,
            link: event?.link,
            timestamp: new Date().toISOString()
          });
        });

        // Add more recording-related events for debugging
        apiRef.current.on('recordingStarted', (event: any) => {
          console.log('🎬 Recording started event (alternative)');
          console.log('📊 Event details:', event);
        });

        apiRef.current.on('recordingStopped', (event: any) => {
          console.log('⏹️ Recording stopped event (alternative)');
          console.log('📊 Event details:', event);
        });

        // Fallback: Set ready after a delay if no events fire
        setTimeout(() => {
          if (!isJitsiReady) {
            console.log('⚠️ Fallback: Setting Jitsi ready after timeout - this may indicate an issue');
            console.log('   Check console for JWT token generation errors');
            console.log('   Verify environment variables are set correctly');
            setIsJitsiReady(true);
          }
        }, 15000); // 15 second timeout for production

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

        // Handle participant events (consolidated with above)
        // Note: participantJoined and participantLeft are already handled above

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
  }, [user, roomName, handleStreamEnd, isJitsiReady, isStreamer, isModerator, fetchViewers, trackViewerJoin, isRecording]);

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

  const debugRecordingState = () => {
    console.log('🔍 === RECORDING DEBUG INFO ===');
    console.log('📊 Current state:', {
      recordingStatus,
      isRecording,
      isJitsiReady,
      isModerator,
      isStreamer,
      hasApiRef: !!apiRef.current,
      hasExecuteCommand: !!(apiRef.current && apiRef.current.executeCommand)
    });
    
    if (apiRef.current) {
      console.log('📊 Jitsi API methods available:', {
        executeCommand: typeof apiRef.current.executeCommand,
        getRecordingState: typeof apiRef.current.getRecordingState,
        isRecording: typeof apiRef.current.isRecording
      });
      
      // Check if recording is supported
      try {
        if (typeof apiRef.current.getRecordingState === 'function') {
          const jitsiRecordingState = apiRef.current.getRecordingState();
          console.log('📊 Jitsi recording state:', jitsiRecordingState);
        }
        
        // Check available commands
        if (typeof apiRef.current.getAvailableCommands === 'function') {
          const commands = apiRef.current.getAvailableCommands();
          console.log('📊 Available Jitsi commands:', commands);
          console.log('📊 Recording supported:', commands?.includes('toggleRecording'));
        }
        
        // Check if recording is enabled in config
        if (apiRef.current.getConfig) {
          const config = apiRef.current.getConfig();
          console.log('📊 Jitsi config (recording related):', {
            recordingEnabled: config?.recording?.enabled,
            recordingMode: config?.recording?.mode,
            recordingService: config?.recording?.service
          });
        }
      } catch (error) {
        console.log('📊 Could not get Jitsi recording info:', error);
      }
    }
    console.log('🔍 === END DEBUG INFO ===');
  };

  const resetRecordingState = () => {
    console.log('🔄 Resetting recording state...');
    console.log('📊 Current recording status:', recordingStatus);
    console.log('📊 Current isRecording:', isRecording);
    setRecordingStatus('idle');
    setIsRecording(false);
    setError(null);
    console.log('✅ Recording state reset to idle');
  };

  const handleToggleRecording = () => {
    console.log('🎬 Recording button clicked');
    console.log('📊 Current state:', {
      isJitsiReady,
      isModerator,
      isStreamer,
      recordingStatus,
      isRecording,
      hasApiRef: !!apiRef.current,
      hasExecuteCommand: !!(apiRef.current && apiRef.current.executeCommand),
      recordingSupported
    });

    if (!isJitsiReady) {
      console.log('❌ Jitsi not ready yet, waiting...');
      return;
    }
    
    if (!isModerator && !isStreamer) {
      console.log('❌ Only moderators and streamers can start/stop recording');
      setError('Only moderators and streamers can control recording');
      return;
    }
    
    // Prevent multiple simultaneous recording operations
    if (recordingStatus === 'starting' || recordingStatus === 'stopping') {
      console.log('⚠️ Recording operation already in progress...');
      return;
    }
    
    try { 
      if (apiRef.current && apiRef.current.executeCommand) {
        if (isRecording) {
          console.log('🛑 Attempting to stop recording...');
          setRecordingStatus('stopping');
          apiRef.current.executeCommand('toggleRecording');
          console.log('✅ toggleRecording command sent for stopping');
          
          // Set timeout for stopping recording
          setTimeout(() => {
            setRecordingStatus(currentStatus => {
              if (currentStatus === 'stopping') {
                console.warn('⏰ Recording stop timeout (10s) - resetting status');
                setIsRecording(false);
                return 'idle';
              }
              return currentStatus;
            });
          }, 10000); // 10 second timeout
        } else {
          console.log('▶️ Attempting to start recording...');
          setRecordingStatus('starting');
          apiRef.current.executeCommand('toggleRecording');
          console.log('✅ toggleRecording command sent for starting');
          
          // Set timeout for starting recording
          setTimeout(() => {
            setRecordingStatus(currentStatus => {
              if (currentStatus === 'starting') {
                console.warn('⏰ Recording start timeout (15s) - resetting status');
                setIsRecording(false);
                setError('Recording start timed out. Please try again.');
                return 'idle';
              }
              return currentStatus;
            });
          }, 15000); // 15 second timeout
        }
      } else {
        console.error('❌ Jitsi API not ready for recording');
        console.error('📊 API Ref exists:', !!apiRef.current);
        console.error('📊 ExecuteCommand exists:', !!(apiRef.current && apiRef.current.executeCommand));
        setRecordingStatus('error');
        setError('Jitsi API not ready for recording');
      }
    } catch (error) {
      console.error('💥 Error toggling recording:', error);
      console.error('📊 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      setRecordingStatus('error');
      setError(`Recording error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to trigger native recording button programmatically
  const triggerNativeRecording = () => {
    console.log('🎬 Triggering native recording button');
    if (apiRef.current && apiRef.current.executeCommand) {
      try {
        apiRef.current.executeCommand('toggleRecording');
        console.log('✅ Native recording button triggered');
      } catch (error) {
        console.error('❌ Error triggering native recording:', error);
        setError('Failed to trigger native recording button');
      }
    } else {
      console.error('❌ Cannot trigger native recording - API not ready');
      setError('Cannot trigger native recording - API not ready');
    }
  };

  const handleHangup = () => {
    console.log('🔄 End stream button clicked');
    console.log('📊 Jitsi ready status:', isJitsiReady);
    console.log('📊 API ref exists:', !!apiRef.current);
    console.log('📊 API has executeCommand:', !!(apiRef.current && apiRef.current.executeCommand));
    
    // Allow ending stream even if Jitsi isn't "ready" - we can still end the stream in the database
    if (!isJitsiReady) {
      console.log('⚠️ Jitsi not ready, but proceeding with stream end anyway...');
    }
    
    try { 
      if (apiRef.current && apiRef.current.executeCommand) {
        console.log('📞 Executing Jitsi hangup command');
        apiRef.current.executeCommand('hangup'); 
      } else {
        console.log('⚠️ Jitsi API not available, ending stream via database only');
      }
    } catch (error) {
      console.error('❌ Error during hangup:', error);
    }
    
    // Always call handleStreamEnd to update database, regardless of Jitsi state
    console.log('🗄️ Ending stream in database...');
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


  return (
    <div className="flex h-screen bg-gray-900">
      {/* Video Stream Container */}
      <div className="relative flex-1 bg-black">
        {/* Video Stream */}
        <div ref={containerRef} className="w-full h-full" />




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
                  <span className="text-gray-300 text-sm">{formatViewerCount(streamData.viewerCount)} watching</span>
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
                {(isStreamer || isModerator) && recordingSupported !== false && (
                  <div className="relative">
                    {/* Show custom recording button only if native recording is not supported or not working */}
                    {recordingSupported !== true && (
                      <button 
                        onClick={handleToggleRecording} 
                        title={
                          recordingStatus === 'starting' || recordingStatus === 'stopping'
                            ? 'Recording in progress... (Click to reset if stuck)'
                            : isRecording 
                            ? 'Stop recording' 
                            : 'Start recording'
                        } 
                        className={`p-3 rounded-xl transition-all ${
                          isRecording 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : recordingStatus === 'starting' || recordingStatus === 'stopping'
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : recordingStatus === 'error'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
                        }`}
                        disabled={false}
                      >
                        {recordingStatus === 'starting' || recordingStatus === 'stopping' ? (
                          <div className="w-6 h-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : isRecording ? (
                          <Square className="w-6 h-6" />
                        ) : (
                          <Circle className="w-6 h-6" />
                        )}
                      </button>
                    )}
                    
                    {/* Show recording status indicator when native recording is supported */}
                    {recordingSupported === true && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={triggerNativeRecording}
                          title="Click to trigger native recording button"
                          className={`p-3 rounded-xl transition-all hover:bg-opacity-80 ${
                            isRecording 
                              ? 'bg-red-600 text-white' 
                              : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
                          }`}
                        >
                          {isRecording ? (
                            <Square className="w-6 h-6" />
                          ) : (
                            <Circle className="w-6 h-6" />
                          )}
                        </button>
                        <span className="text-white text-sm font-medium">
                          {isRecording ? 'Recording...' : 'Click to record'}
                        </span>
                      </div>
                    )}
                    
                    {/* Reset button for stuck states */}
                    {(recordingStatus === 'starting' || recordingStatus === 'stopping' || recordingStatus === 'error') && (
                      <button
                        onClick={resetRecordingState}
                        title="Reset recording state"
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    )}
                    
                    {/* Debug button - always visible for moderators/streamers */}
                    <button
                      onClick={debugRecordingState}
                      title="Debug recording state"
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 text-white rounded-full text-xs hover:bg-blue-600 transition-colors"
                    >
                        ?
                    </button>
                  </div>
                )}
                
                {/* Show message when recording is not supported */}
                {(isStreamer || isModerator) && recordingSupported === false && (
                  <div className="p-3 bg-gray-600 text-white rounded-xl text-sm" title="Recording not supported on this Jitsi instance">
                    📹 No Recording
                  </div>
                )}
                
                <button onClick={() => setShowChat(!showChat)} title={showChat ? 'Hide chat' : 'Show chat'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button onClick={() => setShowParticipants(!showParticipants)} title={showParticipants ? 'Hide participants' : 'Show participants'} className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all">
                  <Users className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => {
                    if (apiRef.current && apiRef.current.executeCommand) {
                      apiRef.current.executeCommand('toggleTileView');
                    }
                  }}
                  title="Toggle grid view"
                  className="p-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
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
          <div className="p-4 border-b border-yellow-500 bg-gray-800 flex items-center justify-between">
            <h3 className="text-white font-semibold">Viewers ({viewers.length + 1})</h3>
            <button
              onClick={refreshParticipants}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              title="Refresh viewers list"
            >
              🔄
            </button>
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

            {/* Other Viewers */}
            {viewers.map((viewer) => {
              // Get profile from the merged data
              const profile = viewer.profile;
              console.log('Rendering viewer:', viewer.user_id, 'with profile:', profile);
              
              const displayName = profile 
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous User'
                : `User ${viewer.user_id?.slice(-6) || 'Unknown'}`;
              const avatar = profile?.profile_photo_url;
              
              console.log('Display name:', displayName, 'Avatar:', avatar);
              
              return (
                <div key={viewer.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {avatar ? (
                      <img 
                        src={avatar} 
                        alt={displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {displayName || 'Anonymous User'}
                        </span>
                        {moderators.includes(viewer.user_id) && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Moderator</span>
                        )}
                      </div>
                      <span className="text-gray-400 text-sm">Viewer</span>
                    </div>
                  </div>
                  
                  {/* Moderator Controls */}
                  {isModerator && viewer.user_id !== user?.uid && (
                    <div className="flex space-x-2">
                      {/* Only streamer can appoint moderators */}
                      {isStreamer && (
                        <button
                          onClick={() => appointModerator(viewer.user_id)}
                          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                          title="Make Moderator"
                        >
                          👑
                        </button>
                      )}
                      {/* Moderators can kick participants */}
                      <button
                        onClick={() => kickParticipant(viewer.user_id)}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        title="Kick Participant"
                      >
                        🚫
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {viewers.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p>No other viewers yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStream;