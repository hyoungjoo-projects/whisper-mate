import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { sentryVitePlugin } from "@sentry/vite-plugin"
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
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: true, // 소스맵 생성 활성화
    },
  }
})