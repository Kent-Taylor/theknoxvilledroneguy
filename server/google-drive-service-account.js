import { createSign } from 'node:crypto'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

let cachedToken = null

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function normalizePrivateKey(privateKey = '') {
  return privateKey.replace(/\\n/g, '\n')
}

function getServiceAccountConfig(env = process.env) {
  if (env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    const parsed = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON)

    return {
      clientEmail: parsed.client_email || '',
      privateKey: normalizePrivateKey(parsed.private_key || ''),
    }
  }

  return {
    clientEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: normalizePrivateKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''),
  }
}

function createServiceAccountJwt(env = process.env) {
  const { clientEmail, privateKey } = getServiceAccountConfig(env)

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Set GOOGLE_SERVICE_ACCOUNT_KEY_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    )
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: DRIVE_READONLY_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      exp: nowSeconds + 3600,
      iat: nowSeconds,
    }),
  )
  const unsignedJwt = `${header}.${payload}`
  const signature = createSign('RSA-SHA256').update(unsignedJwt).sign(privateKey)

  return `${unsignedJwt}.${base64Url(signature)}`
}

async function getDriveAccessToken(env = process.env) {
  if (cachedToken?.accessToken && cachedToken.expiresAt > Date.now() + 60 * 1000) {
    return cachedToken.accessToken
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createServiceAccountJwt(env),
    }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Google service account token failed')
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 3600) * 1000,
  }

  return cachedToken.accessToken
}

export { getDriveAccessToken, getServiceAccountConfig }
