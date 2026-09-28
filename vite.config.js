import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Las librerias cambian mucho menos seguido que el codigo propio.
        // Separadas, el navegador las cachea entre deploys en vez de
        // volver a bajar todo por cada fix de una linea.
        manualChunks: {
          react:    ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts:   ['recharts'],
        },
      },
    },
  }
})
