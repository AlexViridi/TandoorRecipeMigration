import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the code using process.env.API_KEY to work in the browser
    // by redirecting it to a window variable injected at runtime.
    'process.env.API_KEY': 'window.ENV.API_KEY'
  }
});