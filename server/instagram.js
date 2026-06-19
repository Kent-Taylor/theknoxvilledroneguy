import {
  getEffectiveAccessToken,
  getEffectiveProfessionalAccountId,
  maybeRefreshStoredToken,
} from './instagram-auth.js'

const DEFAULT_CACHE_TTL_SECONDS = 30 * 60
const DEFAULT_MEDIA_LIMIT = 9
const DEFAULT_API_VERSION = 'v24.0'
const DEFAULT_API_BASE_URL = 'https://graph.instagram.com'
const MEDIA_FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
const SUPPORTED_MEDIA_TYPES = new Set(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'])

let cache = {
  data: null,
  expiresAt: 0,
}

function getNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

function getConfig(env = process.env) {
  return {
    accessToken: getEffectiveAccessToken(env),
    professionalAccountId: getEffectiveProfessionalAccountId(env),
    apiVersion: env.INSTAGRAM_API_VERSION || DEFAULT_API_VERSION,
    apiBaseUrl: env.INSTAGRAM_API_BASE_URL || DEFAULT_API_BASE_URL,
    cacheTtlSeconds: getNumber(
      env.INSTAGRAM_CACHE_TTL_SECONDS,
      DEFAULT_CACHE_TTL_SECONDS,
      15 * 60,
      60 * 60,
    ),
    mediaLimit: getNumber(env.INSTAGRAM_MEDIA_LIMIT, DEFAULT_MEDIA_LIMIT, 1, 25),
  }
}

function normalizePost(post) {
  const mediaType = post?.media_type || ''

  if (!SUPPORTED_MEDIA_TYPES.has(mediaType)) {
    return null
  }

  return {
    id: String(post.id || ''),
    caption: post.caption || '',
    media_type: mediaType,
    media_url: post.media_url || '',
    thumbnail_url: post.thumbnail_url || '',
    permalink: post.permalink || '',
    timestamp: post.timestamp || '',
  }
}

function cacheHeaders(cacheTtlSeconds) {
  return {
    'Cache-Control': `public, max-age=60, s-maxage=${cacheTtlSeconds}`,
    'Content-Type': 'application/json',
  }
}

function jsonResponse(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers,
  })
  res.end(JSON.stringify(payload))
}

async function fetchInstagramMedia(env = process.env, forceRefresh = false) {
  const now = Date.now()
  await maybeRefreshStoredToken(env).catch(() => null)
  const config = getConfig(env)

  if (!forceRefresh && cache.data && cache.expiresAt > now) {
    return {
      data: cache.data,
      cacheStatus: 'hit',
      cacheTtlSeconds: config.cacheTtlSeconds,
    }
  }

  if (!config.accessToken) {
    throw new Error('Missing INSTAGRAM_ACCESS_TOKEN')
  }

  const url = new URL(
    `${config.apiBaseUrl}/${config.apiVersion}/${config.professionalAccountId}/media`,
  )
  url.searchParams.set('fields', MEDIA_FIELDS)
  url.searchParams.set('limit', String(config.mediaLimit))
  url.searchParams.set('access_token', config.accessToken)

  try {
    const response = await fetch(url)
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = payload?.error?.message || `Instagram responded with ${response.status}`
      throw new Error(message)
    }

    const posts = (Array.isArray(payload.data) ? payload.data : [])
      .map(normalizePost)
      .filter(Boolean)

    cache = {
      data: posts,
      expiresAt: now + config.cacheTtlSeconds * 1000,
    }

    return {
      data: posts,
      cacheStatus: 'miss',
      cacheTtlSeconds: config.cacheTtlSeconds,
    }
  } catch (error) {
    if (cache.data) {
      return {
        data: cache.data,
        cacheStatus: 'stale',
        cacheTtlSeconds: config.cacheTtlSeconds,
      }
    }

    throw error
  }
}

async function handleInstagramApi(req, res, env = process.env) {
  const forceRefresh = new URL(req.url, 'http://localhost').searchParams.get('refresh') === '1'

  try {
    const result = await fetchInstagramMedia(env, forceRefresh)

    res.setHeader('X-Instagram-Cache', result.cacheStatus)
    jsonResponse(res, 200, result.data, cacheHeaders(result.cacheTtlSeconds))
  } catch (error) {
    jsonResponse(res, 502, {
      error: 'Instagram feed unavailable',
      message: error.message,
    })
  }
}

function createInstagramApiMiddleware(env = process.env) {
  return async function instagramApiMiddleware(req, res, next) {
    if (!req.url?.startsWith('/api/instagram')) {
      next()
      return
    }

    await handleInstagramApi(req, res, env)
  }
}

export { createInstagramApiMiddleware, fetchInstagramMedia, handleInstagramApi }
