import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import ThemeProvider from "./components/ThemeProvider";

function App() {
  console.log("App loaded");
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
