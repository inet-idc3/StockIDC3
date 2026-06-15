import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/StockIDC3/',   // ← เพิ่มบรรทัดนี้
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'STOCK IDC-3',
        short_name: 'STOCK IDC-3',
        description: 'INET IDC-3 Stock & Asset Portal',
        start_url: '/StockIDC3/',   // ← แก้จาก '/' เป็นนี้
        display: 'standalone',
        background_color: '#07111E',
        theme_color: '#09D1C7',
        orientation: 'portrait',
        icons: [
          { src: 'icon/android_192x192.webp', sizes: '192x192', type: 'image/webp', purpose: 'any maskable' },
          { src: 'icon/ios_1024x1024.webp',   sizes: '1024x1024', type: 'image/webp' },
          { src: 'icon/ios_180x180.webp',     sizes: '180x180',   type: 'image/webp' }
        ]
      }
    })
  ]
})
