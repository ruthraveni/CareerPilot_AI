import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
    //   manifest: {
    //     name: 'CareerPilot AI',
    //     short_name: 'CareerPilot',
    //     description: 'Your AI Copilot for Smarter Placement Preparation',
    //     theme_color: '#0f172a',
    //     background_color: '#0f172a',
    //     display: 'standalone',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
})
