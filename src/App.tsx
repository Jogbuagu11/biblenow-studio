import React, { useState } from "react";
import LiveStream from "./components/LiveStream";

function App() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [roomName, setRoomName] = useState("vpaas-magic-cookie-ac668e9fea2743709f7c43628fe9d372/SampleRoom123");
  const [jwt, setJwt] = useState("");

  return isStreaming ? (
    <div style={{ height: "100vh" }}>
      <button onClick={() => setIsStreaming(false)}>Stop Stream</button>
      <LiveStream roomName={roomName} jwt={jwt} />
    </div>
  ) : (
    <div style={{ padding: "2rem" }}>
      <h1>BibleNOW Studio</h1>
      <input
        type="text"
        placeholder="Room name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      <textarea
        placeholder="JWT (optional)"
        value={jwt}
        onChange={(e) => setJwt(e.target.value)}
        style={{ width: "100%", height: "100px", marginBottom: "1rem" }}
      />
      <button onClick={() => setIsStreaming(true)}>Start Livestream</button>
    </div>
  );
}

export default App;
