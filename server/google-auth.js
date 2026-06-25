import { randomBytes } from 'node:crypto'
import { createAdminSession, deleteAdminSession, getAdminSession } from './gallery-db.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const PROFILE_SCOPE = 'openid email profile'
const stateStore = new Map()

function getGoogleConfig(env = process.env) {
  return {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: env.GOOGLE_REDIRECT_URI || '',
    allowedEmail: env.GOOGLE_ADMIN_EMAIL || '',
  }
}

function createState() {
  const state = randomBytes(24).toString('hex')
  stateStore.set(state, Date.now() + 10 * 60 * 1000)
  return state
}

function consumeState(state) {
  const expiresAt = stateStore.get(state)
  stateStore.delete(state)

  return Boolean(expiresAt && expiresAt > Date.now())
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || ''
  const match = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))

  return match ? decodeURIComponent(match.slice(name.length + 1)) : ''
}

function getAdminFromRequest(req) {
  return getAdminSession(getCookie(req, 'kgd_session'))
}

function requireAdmin(req, res) {
  const session = getAdminFromRequest(req)

  if (!session) {
    jsonResponse(res, 401, { error: 'Admin login required' })
    return null
  }

  return session
}

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(payload))
}

function redirect(res, location) {
  res.writeHead(302, { Location: location })
  res.end()
}

async function exchangeCodeForTokens(code, env = process.env) {
  const config = getGoogleConfig(env)
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Google token exchange failed')
  }

  return payload
}

async function getGoogleUser(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error?.message || 'Google user lookup failed')
  }

  return payload
}

async function handleGoogleAuthStart(req, res, env = process.env) {
  const config = getGoogleConfig(env)

  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    jsonResponse(res, 500, {
      error: 'Google auth is not configured',
      message: 'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI',
    })
    return
  }

  const authUrl = new URL(GOOGLE_AUTH_URL)
  authUrl.searchParams.set('client_id', config.clientId)
  authUrl.searchParams.set('redirect_uri', config.redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', PROFILE_SCOPE)
  authUrl.searchParams.set('state', createState())

  redirect(res, authUrl.toString())
}

async function handleGoogleAuthCallback(req, res, env = process.env) {
  const callbackUrl = new URL(req.url, 'http://localhost')
  const code = callbackUrl.searchParams.get('code')
  const state = callbackUrl.searchParams.get('state')
  const error = callbackUrl.searchParams.get('error')

  if (error) {
    redirect(res, `/login?error=${encodeURIComponent(error)}`)
    return
  }

  if (!code || !state || !consumeState(state)) {
    redirect(res, '/login?error=invalid_state')
    return
  }

  try {
    const tokens = await exchangeCodeForTokens(code, env)
    const user = await getGoogleUser(tokens.access_token)
    const config = getGoogleConfig(env)

    if (config.allowedEmail && user.email !== config.allowedEmail) {
      redirect(res, '/login?error=not_allowed')
      return
    }

    const sessionToken = randomBytes(32).toString('hex')
    createAdminSession({
      token: sessionToken,
      email: user.email,
      name: user.name,
      picture: user.picture,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })

    res.writeHead(302, {
      Location: '/login',
      'Set-Cookie': `kgd_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
    })
    res.end()
  } catch (authError) {
    redirect(res, `/login?error=${encodeURIComponent(authError.message)}`)
  }
}

async function handleGoogleAuthStatus(req, res) {
  const session = getAdminFromRequest(req)

  jsonResponse(res, 200, {
    loggedIn: Boolean(session),
    user: session
      ? {
          email: session.email,
          name: session.name,
          picture: session.picture,
        }
      : null,
  })
}

async function handleGoogleLogout(req, res) {
  deleteAdminSession(getCookie(req, 'kgd_session'))
  res.writeHead(302, {
    Location: '/login',
    'Set-Cookie': 'kgd_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  })
  res.end()
}

export {
  getAdminFromRequest,
  handleGoogleAuthCallback,
  handleGoogleAuthStart,
  handleGoogleAuthStatus,
  handleGoogleLogout,
  requireAdmin,
}
