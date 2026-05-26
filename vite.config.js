import { defineConfig } from 'vite';
import react from '@vitejs/react-plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'],
      manifest: {
        name: 'Central do Assistente Pessoal',
        short_name: 'Assistente',
        description: 'Painel operacional de métricas, tarefas e gestão pessoal.',
        theme_color: '#7c3aed', // Violeta-600
        background_color: '#09090b', // Zinco-950
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'logo.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
});