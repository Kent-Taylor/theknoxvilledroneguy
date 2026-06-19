import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLocalEnv } from './env.js'
import { handleGalleryApi } from './gallery-api.js'
import {
  handleGoogleAuthCallback,
  handleGoogleAuthStart,
  handleGoogleAuthStatus,
  handleGoogleLogout,
} from './google-auth.js'
import {
  handleInstagramAuthCallback,
  handleInstagramAuthRefresh,
  handleInstagramAuthStart,
  handleInstagramAuthStatus,
} from './instagram-auth.js'
import { handleInstagramApi } from './instagram.js'

loadLocalEnv()

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const publicDir = normalize(join(__dirname, '..', 'dist'))
const port = Number.parseInt(process.env.PORT || '4173', 10)

const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function sendFile(res, filePath) {
  const extension = extname(filePath)
  res.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
  })
  createReadStream(filePath).pipe(res)
}

function resolveStaticPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0])
  const requestedPath = normalize(join(publicDir, cleanPath))

  if (!requestedPath.startsWith(publicDir)) {
    return null
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath
  }

  return join(publicDir, 'index.html')
}

const server = createServer(async (req, res) => {
  if (req.url === '/instagram') {
    res.writeHead(302, { Location: '/gallery' })
    res.end()
    return
  }

  if (req.url?.startsWith('/api/google/auth/start')) {
    await handleGoogleAuthStart(req, res)
    return
  }

  if (req.url?.startsWith('/api/google/auth/callback')) {
    await handleGoogleAuthCallback(req, res)
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

  if (await handleGalleryApi(req, res)) {
    return
  }

  if (req.url?.startsWith('/api/instagram/auth/start')) {
    await handleInstagramAuthStart(req, res)
    return
  }

  if (req.url?.startsWith('/api/instagram/auth/callback')) {
    await handleInstagramAuthCallback(req, res)
    return
  }

  if (req.url?.startsWith('/api/instagram/auth/refresh')) {
    await handleInstagramAuthRefresh(req, res)
    return
  }

  if (req.url?.startsWith('/api/instagram/auth/status')) {
    await handleInstagramAuthStatus(req, res)
    return
  }

  if (req.url?.startsWith('/api/instagram')) {
    await handleInstagramApi(req, res)
    return
  }

  const filePath = resolveStaticPath(req.url || '/')

  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  sendFile(res, filePath)
})

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
