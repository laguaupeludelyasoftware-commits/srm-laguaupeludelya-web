import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const backend = 'http://127.0.0.1:8080';
const proxy = {
  '/api/public/business': backend,
  '/api/auth/login': backend,
  '/api/auth/register': backend,
  '/api/auth/client': backend,
  '/api/management/session': backend,
  '/api/management/contact': backend,
  '/api/management/password': backend,
  '/api/management/services': backend,
  '/api/management/clients': backend,
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { proxy },
});
