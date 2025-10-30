import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv } from "vite"
 
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // Sentry 플러그인 추가 (소스맵 업로드)
      sentryVitePlugin({
        org: env.VITE_SENTRY_ORG,
        project: env.VITE_SENTRY_PROJECT,
        authToken: env.VITE_SENTRY_AUTH_TOKEN,
        disable: mode !== 'production', // 프로덕션 빌드에서만 활성화
        telemetry: false,
        sourcemaps: {
          assets: './dist/**',
          ignore: ['node_modules'],
          filesToDeleteAfterUpload: './dist/**/*.map',
        },
      }),
      // PWA 플러그인 추가
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'vite.svg'],
        manifest: {
          name: 'Whisper Mate',
          short_name: 'WhisperMate',
          description: 'Voice-to-Text Clipboard App',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'vite.svg',
              sizes: 'any',
              type: 'image/svg+xml',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'openai-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: true, // 소스맵 생성 활성화
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor'
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query'
              }
            }
            if (id.includes('src/components/ui')) {
              return 'ui'
            }
          },
        },
      },
    },
  }
})