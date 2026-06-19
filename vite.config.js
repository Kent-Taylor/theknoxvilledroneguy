import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createGalleryApiMiddleware } from './server/gallery-api.js'
import {
  handleGoogleAuthCallback,
  handleGoogleAuthStart,
  handleGoogleAuthStatus,
  handleGoogleLogout,
} from './server/google-auth.js'
import {
  handleInstagramAuthCallback,
  handleInstagramAuthRefresh,
  handleInstagramAuthStart,
  handleInstagramAuthStatus,
} from './server/instagram-auth.js'
import { createInstagramApiMiddleware } from './server/instagram.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), ''),
  }

  return {
    plugins: [
      vue(),
      {
        name: 'local-instagram-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/google/auth/start')) {
              await handleGoogleAuthStart(req, res, env)
              return
            }

            if (req.url?.startsWith('/api/google/auth/callback')) {
              await handleGoogleAuthCallback(req, res, env)
              return
            }

            if (req.url?.startsWith('/api/google/auth/status')) {
              await handleGoogleAuthStatus(req, res)
              return
            }

            if (req.url?.startsWith('/api/google/auth/logout')) {
              await handleGoogleLogout(req, res)
              return
            }

            if (req.url?.startsWith('/api/instagram/auth/start')) {
              await handleInstagramAuthStart(req, res, env)
              return
            }

            if (req.url?.startsWith('/api/instagram/auth/callback')) {
              await handleInstagramAuthCallback(req, res, env)
              return
            }

            if (req.url?.startsWith('/api/instagram/auth/refresh')) {
              await handleInstagramAuthRefresh(req, res, env)
              return
            }

            if (req.url?.startsWith('/api/instagram/auth/status')) {
              await handleInstagramAuthStatus(req, res, env)
              return
            }

            next()
          })
          server.middlewares.use(createGalleryApiMiddleware(env))
          server.middlewares.use(createInstagramApiMiddleware(env))
        },
      },
    ],
  }
})
