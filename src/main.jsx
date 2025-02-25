import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from "./App";
import Pink from "./Pink";
import Orbit from "./Orbit";
import Equalizer from "./Equal";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pink" element={<Pink />} />
        <Route path="/orbit" element={<Orbit />} />
        <Route path="/equal" element={<Equalizer />} />
      </Routes>
    </Router>
  </React.StrictMode>,
);
