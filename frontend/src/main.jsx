import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Forcefully unregister any lingering PWA Service Workers to completely bust stale caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister().then(() => {
        console.log('Stale service worker unregistered.');
        // Optionally force a hard reload immediately if a SW was found, 
        // to guarantee the user transitions to the fresh Vercel bundle
        window.location.reload(true);
      });
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
