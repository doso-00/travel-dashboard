import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Il proxy rende disponibili le tariffe pubbliche Ryanair al provider "Live"
// durante `npm run dev` / `npm run preview` (il browser non può chiamarle
// direttamente per via del CORS).
const proxy = {
  '/api/ryanair': {
    target: 'https://services-api.ryanair.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/ryanair/, ''),
  },
};

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
