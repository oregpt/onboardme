import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Check if we're in white-label mode
const isWhiteLabelMode = document.querySelector('[data-white-label-project], [data-white-label-guide], [data-white-label-slug]');

if (isWhiteLabelMode) {
  // Load white-label components dynamically
  import('./white-label-entry').then(() => {
    // white-label-entry initializes itself
    console.log('White-label mode initialized');
  }).catch(error => {
    console.error('Failed to load white-label components:', error);
  });
} else {
  // Load main app
  createRoot(document.getElementById("root")!).render(<App />);
}
