import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the code using process.env to work in the browser
    // by redirecting to window variables injected at runtime.
    'process.env.API_KEY': 'window.ENV.API_KEY',
    'process.env.TANDOOR_API_KEY': 'window.ENV.TANDOOR_API_KEY'
  }
});