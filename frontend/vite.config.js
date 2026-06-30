import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'es2020',
    // Every route chunk and vendor chunk must stay under 200 KB.
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // ── React Router (separated from core React) ─────────────────────
          if (id.includes('react-router')) return 'vendor-router';

          // ── Core React runtime ───────────────────────────────────────────
          if (
            id.includes('react/') ||
            id.includes('react-dom/') ||
            id.includes('scheduler')
          ) return 'vendor-react';

          // ── Animation ────────────────────────────────────────────────────
          if (id.includes('framer-motion')) return 'vendor-framer';

          // ── Charts: split recharts from its d3 dependencies ──────────────
          // Recharts cartesian/polar renderers go to their own chunk
          if (id.includes('recharts') && (id.includes('/cartesian/') || id.includes('/polar/'))) return 'vendor-recharts-renderers';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('d3-')) return 'vendor-d3';

          // ── Carousel ─────────────────────────────────────────────────────
          if (id.includes('swiper')) return 'vendor-swiper';

          // ── Icon libraries ───────────────────────────────────────────────
          if (id.includes('react-icons') || id.includes('lucide-react')) return 'vendor-icons';

          // ── Backend SDK ──────────────────────────────────────────────────
          if (id.includes('@insforge')) return 'vendor-sdk';

          // ── Data-fetching ────────────────────────────────────────────────
          if (id.includes('@tanstack')) return 'vendor-query';

          // ── Forms ────────────────────────────────────────────────────────
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            id.includes('yup')
          ) return 'vendor-forms';

          // ── State ────────────────────────────────────────────────────────
          if (id.includes('zustand')) return 'vendor-state';

          // ── Notifications ────────────────────────────────────────────────
          if (id.includes('react-hot-toast')) return 'vendor-toast';

          // ── HTTP client ──────────────────────────────────────────────────
          if (id.includes('axios')) return 'vendor-axios';

          // ── Everything else in node_modules goes to vendor-misc ──────────
          return 'vendor-misc';
        }
      }
    }
  }
})

