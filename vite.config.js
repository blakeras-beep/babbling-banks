import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: false,
    // The catalog chunk is intentionally large (the whole episode database).
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Keep the (large) episode catalog in its own chunk so app code updates
        // don't force users to re-download the whole catalog.
        manualChunks(id) {
          if (id.includes('/src/data/')) return 'catalog';
          if (id.includes('node_modules/@supabase')) return 'supabase';
          if (id.includes('node_modules/react')) return 'react';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.{js,mjs}'],
  },
});
