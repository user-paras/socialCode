import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
const mode = process.env.NODE_ENV || 'development';
const env = loadEnv(mode, process.cwd(), '');

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // include: ['lucide-react'], // Removed from exclude, Vite will pre-bundle it
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
  }
});
