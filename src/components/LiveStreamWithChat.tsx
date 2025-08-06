import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSupabaseAuthStore } from '../stores/supabaseAuthStore';
import { databaseService } from '../services/databaseService';
import { jaasConfig } from '../config/jaas';
import jwtAuthService from '../services/jwtAuthService';
import LiveStreamChat from './LiveStreamChat';
import { MessageCircle, X, Maximize2, Minimize2 } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface Props {
  roomName: string;
  isStreamer?: boolean;
}

const LiveStreamWithChat: React.FC<Props> = ({ roomName, isStreamer = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { user } = useSupabaseAuthStore();
  const [isEnding, setIsEnding] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  }, [user, isEnding]);

  useEffect(() => {
    // Add beforeunload event listener to end stream when browser closes
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (isStreamer && user) {
        console.log('Browser closing, ending stream...');
        try {
          await databaseService.endStreamOnRedirect(user.uid);
        } catch (error) {
          console.error('Error ending stream on browser close:', error);
        }
      }
    };

    // Add page visibility change handler to end stream when user switches tabs
    const handleVisibilityChange = async () => {
      if (isStreamer && user && document.hidden) {
        console.log('Page hidden, ending stream...');
        try {
          await databaseService.endStreamOnRedirect(user.uid);
        } catch (error) {
          console.error('Error ending stream on page hide:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
      const container = containerRef.current;
      if (container) {
        container.innerHTML = '';
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

      if (!container) {
        console.error("Container ref not available.");
        return;
      }

      // Generate JWT token for moderator authentication
      // All verified users are moderators
      let jwtToken = null;
      if (user) {
        try {
          jwtToken = await jwtAuthService.generateModeratorToken(user, roomName);
        } catch (error) {
          console.error('Error generating JWT token:', error);
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
        // Add JWT token if available
        ...(jwtToken && { jwt: jwtToken }),
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
          enableClosePage: false, // Disable 8x8 close page
          // Allow anonymous users
          anonymousUserRole: 'guest',
          // Disable authentication requirements
          authenticationRequired: false
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'recording',
            'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security',
            'shareaudio', 'sharevideo', 'shareddesktop', 'invite'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          // Disable Jitsi's built-in chat
          DISABLE_CHAT: true,
          HIDE_CHAT_BUTTON: true
        }
      };

      console.log('Initializing Jitsi with domain:', jaasConfig.domain);
      console.log('Room name:', roomName);
      console.log('JAAS App ID:', jaasConfig.appId);
      
      try {
        apiRef.current = new window.JitsiMeetExternalAPI(jaasConfig.domain, options);
        console.log('JitsiMeetExternalAPI initialized successfully');
      } catch (error) {
        console.error('Failed to initialize JitsiMeetExternalAPI:', error);
        return;
      }

      // Add event listeners for meeting end with robust error handling
      apiRef.current.addEventListeners({
        readyToClose: async () => {
          console.log('Meeting ready to close');
          await handleStreamEnd('readyToClose');
        },
        videoConferenceJoined: () => {
          console.log('Joined video conference');
        },
        videoConferenceLeft: async () => {
          console.log('Left video conference');
          await handleStreamEnd('videoConferenceLeft');
        },
        participantLeft: (participant: any) => {
          console.log('Participant left:', participant);
        },
        participantJoined: (participant: any) => {
          console.log('Participant joined:', participant);
        },
        hangup: async () => {
          console.log('Meeting hung up');
          await handleStreamEnd('hangup');
        },
        // Add additional event listeners for better coverage
        conferenceTerminated: async () => {
          console.log('Conference terminated');
          await handleStreamEnd('conferenceTerminated');
        },
        videoConferenceWillJoin: () => {
          console.log('Will join video conference');
        },
        audioMuteStatusChanged: (data: any) => {
          console.log('Audio mute status changed:', data);
        },
        videoMuteStatusChanged: (data: any) => {
          console.log('Video mute status changed:', data);
        }
      });
    };

    // Call the async function
    initializeJitsi();

    // Capture ref values at effect time to avoid stale closure issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const api = apiRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const container = containerRef.current;
    
    return () => {
      if (api) {
        console.log('Cleaning up Jitsi instance on unmount');
        try {
          api.dispose();
        } catch (error) {
          console.error('Error disposing Jitsi instance on unmount:', error);
        }
        apiRef.current = null;
      }
      
      // Clear container
      if (container) {
        container.innerHTML = '';
      }
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roomName, user, handleStreamEnd, isStreamer]);

  // Cleanup function to end stream when component unmounts
  useEffect(() => {
    return () => {
      if (isStreamer && user) {
        console.log('Component unmounting, ending stream...');
        databaseService.endStreamOnRedirect(user.uid).catch(error => {
          console.error('Error ending stream on unmount:', error);
        });
      }
    };
  }, [isStreamer, user]);

  // Handle fullscreen toggle
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
      <div className={`relative ${showChat ? 'flex-1' : 'flex-1'} bg-black`}>
        {/* Video Stream */}
        <div ref={containerRef} className="w-full h-full" />
        
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
          <LiveStreamChat 
            roomId={encodeURIComponent(roomName)} 
            isModerator={isStreamer || !!user}
          />
        </div>
      )}
    </div>
  );
};

export default LiveStreamWithChat; 