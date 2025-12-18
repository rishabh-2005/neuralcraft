import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // ⬇️ THIS IS THE CRITICAL FIX
    dedupe: ['react', 'react-dom', '@dnd-kit/core', '@dnd-kit/utilities'],
  },
})