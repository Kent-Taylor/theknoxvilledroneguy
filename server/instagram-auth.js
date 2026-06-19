import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

const DEFAULT_SCOPES = ['instagram_business_basic']

const TOKEN_STORE_PATH = join(process.cwd(), '.instagram-auth.json')
const AUTH_BASE_URL = 'https://www.instagram.com/oauth/authorize'
const TOKEN_EXCHANGE_URL = 'https://api.instagram.com/oauth/access_token'
const LONG_LIVED_TOKEN_URL = 'https://graph.instagram.com/access_token'
const REFRESH_TOKEN_URL = 'https://graph.instagram.com/refresh_access_token'
const PROFILE_URL = 'https://graph.instagram.com/me'
const stateStore = new Map()

function getAuthConfig(env = process.env) {
  return {
    appId: env.INSTAGRAM_APP_ID || '',
    appSecret: env.INSTAGRAM_APP_SECRET || '',
    redirectUri: env.INSTAGRAM_REDIRECT_URI || '',
    scopes: (env.INSTAGRAM_LOGIN_SCOPES || DEFAULT_SCOPES.join(','))
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean),
    tokenStorePath: env.INSTAGRAM_TOKEN_STORE_PATH || TOKEN_STORE_PATH,
  }
}

function readStoredAuth(env = process.env) {
  const { tokenStorePath } = getAuthConfig(env)

  if (!existsSync(tokenStorePath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(tokenStorePath, 'utf8'))
  } catch {
    return null
  }
}

function writeStoredAuth(payload, env = process.env) {
  const { tokenStorePath } = getAuthConfig(env)
  writeFileSync(tokenStorePath, JSON.stringify(payload, null, 2))
}

function createState() {
  return randomBytes(24).toString('hex')
}

function rememberState(state) {
  stateStore.set(state, Date.now() + 10 * 60 * 1000)
}

function consumeState(state) {
  const expiresAt = stateStore.get(state)
  stateStore.delete(state)

  return Boolean(expiresAt && expiresAt > Date.now())
}

function getEffectiveAccessToken(env = process.env) {
  const stored = readStoredAuth(env)
  return env.INSTAGRAM_ACCESS_TOKEN || stored?.access_token || ''
}

function getEffectiveProfessionalAccountId(env = process.env) {
  const stored = readStoredAuth(env)
  return env.INSTAGRAM_PROFESSIONAL_ACCOUNT_ID || stored?.user_id || 'me'
}

async function exchangeCodeForShortLivedToken(code, env = process.env) {
  const config = getAuthConfig(env)
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code,
  })

  const response = await fetch(TOKEN_EXCHANGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error_message || payload?.error?.message || 'Token exchange failed'
    throw new Error(message)
  }

  return payload
}

async function exchangeForLongLivedToken(shortLivedToken, env = process.env) {
  const config = getAuthConfig(env)
  const url = new URL(LONG_LIVED_TOKEN_URL)
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', config.appSecret)
  url.searchParams.set('access_token', shortLivedToken)

  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error?.message || 'Long-lived token exchange failed'
    throw new Error(message)
  }

  return payload
}

async function refreshLongLivedToken(accessToken) {
  const url = new URL(REFRESH_TOKEN_URL)
  url.searchParams.set('grant_type', 'ig_refresh_token')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error?.message || 'Token refresh failed'
    throw new Error(message)
  }

  return payload
}

async function fetchAuthorizedProfile(accessToken) {
  const url = new URL(PROFILE_URL)
  url.searchParams.set('fields', 'id,username,account_type')
  url.searchParams.set('access_token', accessToken)

  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error?.message || 'Profile lookup failed'
    throw new Error(message)
  }

  return payload
}

async function maybeRefreshStoredToken(env = process.env) {
  const stored = readStoredAuth(env)

  if (!stored?.access_token || !stored?.expires_at || !stored?.obtained_at) {
    return stored
  }

  const now = Date.now()
  const expiresAt = new Date(stored.expires_at).getTime()
  const obtainedAt = new Date(stored.obtained_at).getTime()
  const hasEnoughAge = now - obtainedAt > 24 * 60 * 60 * 1000
  const shouldRefresh = expiresAt - now < 14 * 24 * 60 * 60 * 1000

  if (!hasEnoughAge || !shouldRefresh) {
    return stored
  }

  const refreshed = await refreshLongLivedToken(stored.access_token)
  const nextStored = {
    ...stored,
    access_token: refreshed.access_token || stored.access_token,
    expires_in: refreshed.expires_in || stored.expires_in,
    obtained_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + (refreshed.expires_in || 0) * 1000).toISOString(),
  }

  writeStoredAuth(nextStored, env)
  return nextStored
}

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(payload))
}

function htmlResponse(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
  })
  res.end(body)
}

async function handleInstagramAuthStart(req, res, env = process.env) {
  const config = getAuthConfig(env)

  if (!config.appId || !config.appSecret || !config.redirectUri) {
    jsonResponse(res, 500, {
      error: 'Instagram auth is not configured',
      message: 'Missing INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, or INSTAGRAM_REDIRECT_URI',
    })
    return
  }

  const state = createState()
  rememberState(state)

  const authUrl = new URL(AUTH_BASE_URL)
  authUrl.searchParams.set('enable_fb_login', '0')
  authUrl.searchParams.set('force_authentication', '1')
  authUrl.searchParams.set('client_id', config.appId)
  authUrl.searchParams.set('redirect_uri', config.redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', config.scopes.join(','))
  authUrl.searchParams.set('state', state)

  res.writeHead(302, { Location: authUrl.toString() })
  res.end()
}

async function handleInstagramAuthCallback(req, res, env = process.env) {
  const callbackUrl = new URL(req.url, 'http://localhost')
  const code = callbackUrl.searchParams.get('code')
  const state = callbackUrl.searchParams.get('state')
  const errorReason = callbackUrl.searchParams.get('error_reason')
  const errorDescription = callbackUrl.searchParams.get('error_description')

  if (errorReason || errorDescription) {
    htmlResponse(
      res,
      400,
      `<h1>Instagram authorization failed</h1><p>${errorDescription || errorReason}</p>`,
    )
    return
  }

  if (!code || !state || !consumeState(state)) {
    htmlResponse(res, 400, '<h1>Instagram authorization failed</h1><p>Invalid or expired state.</p>')
    return
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code, env)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, env)
    const profile = await fetchAuthorizedProfile(longLived.access_token || shortLived.access_token)

    writeStoredAuth(
      {
        access_token: longLived.access_token || shortLived.access_token,
        token_type: longLived.token_type || shortLived.token_type || 'bearer',
        expires_in: longLived.expires_in || shortLived.expires_in || 0,
        obtained_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + (longLived.expires_in || shortLived.expires_in || 0) * 1000,
        ).toISOString(),
        user_id: profile.id || shortLived.user_id || 'me',
        username: profile.username || '',
        account_type: profile.account_type || '',
      },
      env,
    )

    htmlResponse(
      res,
      200,
      `
        <html>
          <body style="font-family: Inter, system-ui, sans-serif; padding: 32px; color: #101014">
            <h1>Instagram connected</h1>
            <p>@${profile.username || 'the_knoxville_drone_guy'} is now authorized for the site feed.</p>
            <p>You can close this window and return to the site.</p>
            <p><a href="/">Back to the site</a></p>
          </body>
        </html>
      `,
    )
  } catch (error) {
    htmlResponse(res, 500, `<h1>Instagram authorization failed</h1><p>${error.message}</p>`)
  }
}

async function handleInstagramAuthRefresh(req, res, env = process.env) {
  try {
    const stored = readStoredAuth(env)

    if (!stored?.access_token) {
      jsonResponse(res, 400, {
        error: 'No stored Instagram token',
      })
      return
    }

    const refreshed = await refreshLongLivedToken(stored.access_token)
    const nextStored = {
      ...stored,
      access_token: refreshed.access_token || stored.access_token,
      expires_in: refreshed.expires_in || stored.expires_in,
      obtained_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + (refreshed.expires_in || 0) * 1000).toISOString(),
    }

    writeStoredAuth(nextStored, env)
    jsonResponse(res, 200, {
      ok: true,
      username: nextStored.username || '',
      expires_at: nextStored.expires_at,
    })
  } catch (error) {
    jsonResponse(res, 500, {
      error: 'Token refresh failed',
      message: error.message,
    })
  }
}

async function handleInstagramAuthStatus(req, res, env = process.env) {
  try {
    const stored = await maybeRefreshStoredToken(env)
    jsonResponse(res, 200, {
      connected: Boolean(env.INSTAGRAM_ACCESS_TOKEN || stored?.access_token),
      username: stored?.username || '',
      account_type: stored?.account_type || '',
      expires_at: stored?.expires_at || '',
    })
  } catch (error) {
    jsonResponse(res, 200, {
      connected: false,
      username: '',
      account_type: '',
      expires_at: '',
      error: error.message,
    })
  }
}

export {
  getEffectiveAccessToken,
  getEffectiveProfessionalAccountId,
  handleInstagramAuthCallback,
  handleInstagramAuthRefresh,
  handleInstagramAuthStart,
  handleInstagramAuthStatus,
  maybeRefreshStoredToken,
  readStoredAuth,
}
