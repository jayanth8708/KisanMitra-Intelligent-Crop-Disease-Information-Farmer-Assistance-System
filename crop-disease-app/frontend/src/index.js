import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: "#1f2937", color: "#f9fafb", borderRadius: "12px" },
          success: { iconTheme: { primary: "#22c55e", secondary: "#f9fafb" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#f9fafb" } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
