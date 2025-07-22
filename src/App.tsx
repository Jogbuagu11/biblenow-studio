import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import LiveStream from "./components/LiveStream";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/live-stream" element={<LiveStreamPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

// LiveStream page component
const LiveStreamPage: React.FC = () => {
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [roomName, setRoomName] = React.useState("vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372/SampleRoom123");
  const [jwt, setJwt] = React.useState("");

  return isStreaming ? (
    <div style={{ height: "100vh" }}>
      <button 
        onClick={() => setIsStreaming(false)}
        className="absolute top-4 left-4 z-10 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
      >
        Stop Stream
      </button>
      <LiveStream roomName={roomName} jwt={jwt} />
    </div>
  ) : (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">BibleNOW Studio - Live Stream</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Name
            </label>
            <input
              type="text"
              placeholder="Room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JWT (optional)
            </label>
            <textarea
              placeholder="JWT (optional)"
              value={jwt}
              onChange={(e) => setJwt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />
          </div>
          <button 
            onClick={() => setIsStreaming(true)}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
          >
            Start Livestream
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
