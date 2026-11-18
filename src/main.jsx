import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.jsx";
import "./styles.css";

import { AuthProvider } from "./context/AuthContext";
import { applyAppearance, loadAppearance } from "./lib/appearance";

// يُطبَّق قبل أول رسم لتفادي وميض الوضع الفاتح.
applyAppearance(loadAppearance());

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </AuthProvider>
  </BrowserRouter>,
);
