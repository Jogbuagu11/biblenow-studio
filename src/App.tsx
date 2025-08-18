import React from "react";
import { BrowserRouter as Router, Route, Routes, useParams } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Streams from "./pages/Streams";
import GoLive from "./pages/GoLive";
import Viewers from "./pages/Viewers";
import Shekelz from "./pages/Shekelz";
import Payments from "./pages/Payments";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import LiveStream from "./components/LiveStream";
import EndStream from "./pages/EndStream";
import DownloadApp from "./pages/DownloadApp";
import ThemeProvider from "./components/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLivestreamStore, useSupabaseAuthStore } from "./stores";

import { checkForCorsIssues } from "./utils/clearCache";

function App() {
  const { initialize } = useSupabaseAuthStore();

  React.useEffect(() => {
    initialize();
    if (process.env.NODE_ENV === 'development') {
      checkForCorsIssues();
    }
  }, [initialize]);

  console.log("App loaded", {
    currentPath: window.location.pathname,
    currentUrl: window.location.href
  });
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/endstream" element={<EndStream />} />
          <Route path="/download-app" element={<DownloadApp />} />

          {/* Public viewer routes (path-based and catch-all) */}
          <Route path="/live/:room" element={<LiveStreamPage />} />
          <Route path="/live" element={<LiveStreamPage />} />
          <Route path="/live-stream/:room" element={<LiveStreamPage />} />
          <Route path="/live-stream" element={<LiveStreamPage />} />
          
          {/* Test route to verify routing is working */}
          <Route path="/test-route" element={<div>Test route working!</div>} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Dashboard /></div></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Schedule /></div></ProtectedRoute>} />
          <Route path="/streams" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Streams /></div></ProtectedRoute>} />
          <Route path="/go-live" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><GoLive /></div></ProtectedRoute>} />
          <Route path="/viewers" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Viewers /></div></ProtectedRoute>} />
          <Route path="/shekelz" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Shekelz /></div></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Payments /></div></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Analytics /></div></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Settings /></div></ProtectedRoute>} />
          <Route path="*" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><NotFound /></div></ProtectedRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

// LiveStream page component
const LiveStreamPage: React.FC = () => {
  const { isStreaming, setIsStreaming, currentStream, stopStream } = useLivestreamStore();
  const { room: roomFromParams } = useParams<{ room?: string }>();

  const [roomName, setRoomName] = React.useState("");

  console.log('LiveStreamPage: Component rendered', {
    isStreaming,
    roomFromParams,
    roomName,
    currentPath: window.location.pathname
  });

  // Derive room from path segments first, then query string
  React.useEffect(() => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    // Expect ['live', '{room}', ...] or ['live-stream', '{room}', ...]
    let roomFromPath = "";
    if (pathParts.length >= 2 && (pathParts[0] === 'live' || pathParts[0] === 'live-stream')) {
      roomFromPath = decodeURIComponent(pathParts[1] || "");
    }
    const qsRoom = new URLSearchParams(window.location.search).get('room') || "";
    const derivedRoom = roomFromParams || roomFromPath || qsRoom;

    console.log('LiveStreamPage: Deriving room name', {
      pathParts,
      roomFromParams,
      roomFromPath,
      qsRoom,
      derivedRoom
    });

    // If we have a room from the URL, start streaming immediately
    if (derivedRoom && derivedRoom.trim()) {
      console.log('LiveStreamPage: Starting stream with room:', derivedRoom);
      setRoomName(derivedRoom);
      setIsStreaming(true);
    } else {
      console.log('LiveStreamPage: No room found in URL, showing form');
    }
  }, [roomFromParams, setIsStreaming]);

  // Cleanup when component unmounts
  React.useEffect(() => {
    return () => {
      if (isStreaming && currentStream) {
        stopStream(currentStream.id);
        setIsStreaming(false);
      }
    };
  }, [isStreaming, currentStream, stopStream, setIsStreaming]);

  const handleStartStream = () => {
    if (!roomName.trim()) {
      alert("Please enter a room name");
      return;
    }
    setIsStreaming(true);
  };

  return (
    <>
      {isStreaming ? (
        <div style={{ height: "100vh" }}>
          <LiveStream roomName={roomName} isStreamer={true} />
        </div>
      ) : (
        <div className="min-h-screen p-8 transition-colors duration-200">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 transition-colors duration-200">BibleNOW Studio - Live Stream</h1>
            <div className="bg-offWhite-25 dark:bg-chocolate-800 rounded-lg shadow-md p-6 transition-colors duration-200">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-200">
                  Room Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter room name (letters, numbers, hyphens, underscores only)"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-chocolate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-chocolate-500 bg-white dark:bg-chocolate-700 text-gray-900 dark:text-white transition-colors duration-200"
                  required
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-200">
                  Room names can contain letters, numbers, hyphens, and underscores. Avoid special characters and spaces.
                </p>
              </div>
              <button 
                onClick={handleStartStream}
                disabled={!roomName.trim()}
                className="w-full bg-chocolate-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-chocolate-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Start Livestream
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
// Force new deployment - Wed Aug  6 01:15:51 PDT 2025
