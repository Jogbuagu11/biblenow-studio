import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface Props {
  roomName: string;
  jwt?: string;
}

const LiveStream: React.FC<Props> = ({ roomName, jwt }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!window.JitsiMeetExternalAPI) {
      console.error("Jitsi script not loaded.");
      return;
    }

    if (!containerRef.current) {
      console.error("Container ref not available.");
      return;
    }

    const domain = "8x8.vc";
    const options: any = {
      roomName,
      parentNode: containerRef.current,
      width: "100%",
      height: "100%",
    };

    if (jwt) {
      options.jwt = jwt;
    }

    apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, jwt]);

  return <div ref={containerRef} style={{ height: "100vh", width: "100%" }} />;
};

export default LiveStream;
