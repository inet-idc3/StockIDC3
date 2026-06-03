// ─────────────────────────────────────────────────────────────
// main.jsx — App entry point
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import './styles/employee.css';
import App from './App.jsx';

// Google Fonts + Tabler Icons
const fontLink = document.createElement('link');
fontLink.rel  = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800;900&family=Prompt:wght@600;700;800&family=Space+Mono:wght@400;700&display=swap';
document.head.appendChild(fontLink);

const iconLink = document.createElement('link');
iconLink.rel  = 'stylesheet';
iconLink.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css';
document.head.appendChild(iconLink);

// jsQR for QR scanning
const jsqrScript = document.createElement('script');
jsqrScript.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
document.head.appendChild(jsqrScript);

// Portal for employee overlay
const empPortal = document.createElement('div');
empPortal.id = 'emp-overlay-portal';
document.body.appendChild(empPortal);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
