import React from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
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
import ThemeProvider from "./components/ThemeProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLivestreamStore, useAuthStore } from "./stores";
import "./config/firebase"; // Initialize Firebase

function App() {
  const { initialize } = useAuthStore();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/endstream" element={<EndStream />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Dashboard /></div></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Schedule /></div></ProtectedRoute>} />
          <Route path="/streams" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><Streams /></div></ProtectedRoute>} />
          <Route path="/go-live" element={<ProtectedRoute><div className="min-h-screen bg-offWhite-50 dark:bg-chocolate-900 transition-colors duration-200"><GoLive /></div></ProtectedRoute>} />
          <Route path="/live-stream" element={<ProtectedRoute><LiveStreamPage /></ProtectedRoute>} />
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
  const navigate = useNavigate();
  const { isStreaming, setIsStreaming, currentStream, stopStream } = useLivestreamStore();
  
  const [roomName, setRoomName] = React.useState("");

  // Parse URL parameters on component mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    
    if (roomParam) {
      setRoomName(roomParam);
      setIsStreaming(true);
    }
  }, [setIsStreaming]);

  // Cleanup when component unmounts
  React.useEffect(() => {
    return () => {
      // If we're leaving the stream page and still streaming, stop the stream
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
          <button 
            onClick={async () => {
              setIsStreaming(false);
              if (currentStream) {
                await stopStream(currentStream.id);
              }
              navigate('/dashboard');
            }}
            className="absolute top-4 left-4 z-10 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Stop Stream
          </button>
          <LiveStream roomName={roomName} />
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
