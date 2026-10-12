import { defineConfig } from 'vite';
export default defineConfig({
  // Relative assets work under /LastBastion/ on Pages and in a local preview.
  base: './',
  build: { rollupOptions: { output: { manualChunks: (id) => id.includes('/node_modules/three/') ? id.includes('/build/three.core.js') ? 'three-core' : 'three-renderer' : undefined } } },
});
