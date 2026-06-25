import { google } from 'googleapis'

const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

let cachedRawJson = ''
let cachedAuth = null
let cachedDrive = null

function getServiceAccountCredentials(env = process.env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!raw) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON')
  }

  try {
    const credentials = JSON.parse(raw)

    if (!credentials.client_email || !credentials.private_key) {
      throw new Error('missing client_email or private_key')
    }

    return credentials
  } catch (error) {
    throw new Error(
      'Invalid GOOGLE_SERVICE_ACCOUNT_JSON. Make sure the full service account JSON was pasted into Railway.',
    )
  }
}

function getDriveAuth(env = process.env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON || ''

  if (cachedAuth && cachedRawJson === raw) {
    return cachedAuth
  }

  cachedRawJson = raw
  cachedDrive = null
  cachedAuth = new google.auth.GoogleAuth({
    credentials: getServiceAccountCredentials(env),
    scopes: [DRIVE_READONLY_SCOPE],
  })

  return cachedAuth
}

function getDriveClient(env = process.env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON || ''

  if (cachedDrive && cachedRawJson === raw) {
    return cachedDrive
  }

  cachedDrive = google.drive({
    version: 'v3',
    auth: getDriveAuth(env),
  })

  return cachedDrive
}

async function getDriveAccessToken(env = process.env) {
  const authClient = await getDriveAuth(env).getClient()
  const tokenResponse = await authClient.getAccessToken()
  const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token

  if (!accessToken) {
    throw new Error('Unable to create a Google Drive service account access token')
  }

  return accessToken
}

export { DRIVE_READONLY_SCOPE, getDriveAccessToken, getDriveClient, getServiceAccountCredentials }
