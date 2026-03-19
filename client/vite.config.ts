import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API calls from the React dev server to the ASP.NET Core API.
      '/api': {
        target: 'http://localhost:5094',
        changeOrigin: true
      }
    }
  }
})
