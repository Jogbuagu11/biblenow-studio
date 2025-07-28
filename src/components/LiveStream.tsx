import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { databaseService } from '../services/databaseService';
import { jaasConfig } from '../config/firebase';
import jwtAuthService from '../services/jwtAuthService';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface Props {
  roomName: string;
}

const LiveStream: React.FC<Props> = ({ roomName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const { user } = useAuthStore();
  const [isEnding, setIsEnding] = useState(false);

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
    const initializeJitsi = async () => {
      if (!window.JitsiMeetExternalAPI) {
        console.error("Jitsi script not loaded.");
        return;
      }

      if (!containerRef.current) {
        console.error("Container ref not available.");
        return;
      }

      const domain = jaasConfig.domain;
      
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

      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

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

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, user, handleStreamEnd]);

  return <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />;
};

export default LiveStream;
