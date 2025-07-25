import React, { useEffect, useRef } from "react";
import { jaasConfig } from "../config/firebase";
import { useAuthStore } from "../stores";
import jwtAuthService from "../services/jwtAuthService";
import { databaseService } from "../services/databaseService";

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

  useEffect(() => {
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
      jwtToken = jwtAuthService.generateModeratorToken(user, roomName);
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
        email: user?.email || "user@biblenowstudio.com"
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

    // Add event listeners for meeting end
    apiRef.current.addEventListeners({
      readyToClose: async () => {
        console.log('Meeting ready to close');
        // End the stream in database before redirecting
        if (user) {
          try {
            await databaseService.endStreamOnRedirect(user.uid);
            console.log('Stream ended in database');
          } catch (error) {
            console.error('Error ending stream:', error);
          }
        }
        window.location.href = '/endstream';
      },
      videoConferenceJoined: () => {
        console.log('Joined video conference');
      },
      videoConferenceLeft: async () => {
        console.log('Left video conference');
        // End the stream in database before redirecting
        if (user) {
          try {
            await databaseService.endStreamOnRedirect(user.uid);
            console.log('Stream ended in database');
          } catch (error) {
            console.error('Error ending stream:', error);
          }
        }
        window.location.href = '/endstream';
      },
      participantLeft: (participant: any) => {
        console.log('Participant left:', participant);
      },
      participantJoined: (participant: any) => {
        console.log('Participant joined:', participant);
      },
      hangup: async () => {
        console.log('Meeting hung up');
        // End the stream in database before redirecting
        if (user) {
          try {
            await databaseService.endStreamOnRedirect(user.uid);
            console.log('Stream ended in database');
          } catch (error) {
            console.error('Error ending stream:', error);
          }
        }
        window.location.href = '/endstream';
      }
    });

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, user]);

  return <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />;
};

export default LiveStream;
