import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'lucide-react', 'recharts']
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('/node_modules/')) {
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (normalizedId.includes('/node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (
              normalizedId.includes('/node_modules/recharts/') ||
              normalizedId.includes('/node_modules/d3-')
            ) {
              return 'vendor-charts';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
