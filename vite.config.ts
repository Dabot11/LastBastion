import { defineConfig } from 'vite';
export default defineConfig({
  // Relative assets work under /LastBastion/ on Pages and in a local preview.
  base: './',
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
});
