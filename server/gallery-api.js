import {
  getGalleryItem,
  getGalleryItems,
  reorderGalleryItems,
  syncGalleryItems,
  updateGalleryItem,
} from './gallery-db.js'
import { getDriveAccessToken, getDriveClient } from './google-drive-service-account.js'
import { requireAdmin } from './google-auth.js'

const DRIVE_LIST_FIELDS =
  'nextPageToken,files(id,name,mimeType,modifiedTime,createdTime,thumbnailLink,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis))'

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req) {
  let raw = ''

  for await (const chunk of req) {
    raw += chunk
  }

  return raw ? JSON.parse(raw) : {}
}

function getDriveMediaType(mimeType = '') {
  if (mimeType.startsWith('video/')) {
    return 'VIDEO'
  }

  if (mimeType.startsWith('image/')) {
    return 'IMAGE'
  }

  return ''
}

function expandDriveThumbnailLink(thumbnailLink = '') {
  return thumbnailLink.replace(/=s\d+$/, '=s1200')
}

function getGoogleDriveErrorMessage(error, fallback) {
  const message = error?.response?.data?.error?.message || error?.message || fallback

  if (error?.code === 404 || error?.response?.status === 404) {
    return `${message}. Confirm GOOGLE_DRIVE_GALLERY_FOLDER_ID is correct and the folder is shared with the service account.`
  }

  if (error?.code === 403 || error?.response?.status === 403) {
    return `${message}. Confirm the Drive folder is shared with the service account email.`
  }

  return message
}

function getResponseHeader(headers, name) {
  return headers?.get?.(name) || headers?.[name] || headers?.[name.toLowerCase()] || ''
}

function normalizeDriveFile(file) {
  const mediaType = getDriveMediaType(file.mimeType)
  const mediaMetadata =
    mediaType === 'VIDEO' ? file.videoMediaMetadata || {} : file.imageMediaMetadata || {}

  return {
    id: file.id,
    name: file.name || file.id,
    mediaType,
    mimeType: file.mimeType || 'application/octet-stream',
    timestamp: file.modifiedTime || file.createdTime || '',
    width: Number.parseInt(mediaMetadata.width, 10) || null,
    height: Number.parseInt(mediaMetadata.height, 10) || null,
    durationMillis: Number.parseInt(mediaMetadata.durationMillis, 10) || null,
    thumbnailLink: expandDriveThumbnailLink(file.thumbnailLink || ''),
  }
}

async function getGalleryFolderId(env = process.env) {
  if (env.GOOGLE_DRIVE_GALLERY_FOLDER_ID) {
    return env.GOOGLE_DRIVE_GALLERY_FOLDER_ID
  }

  throw new Error('Missing GOOGLE_DRIVE_GALLERY_FOLDER_ID')
}

async function fetchDriveFolderMedia(env = process.env) {
  const folderId = await getGalleryFolderId(env)
  const files = []
  let pageToken = ''
  const drive = getDriveClient(env)

  do {
    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')`,
        fields: DRIVE_LIST_FIELDS,
        pageSize: 100,
        orderBy: 'modifiedTime desc',
        pageToken: pageToken || undefined,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      })

      files.push(...(response.data.files || []).map(normalizeDriveFile).filter((file) => file.mediaType))
      pageToken = response.data.nextPageToken || ''
    } catch (error) {
      throw new Error(getGoogleDriveErrorMessage(error, 'Unable to list Google Drive gallery folder'))
    }
  } while (pageToken)

  return files
}

async function refreshGalleryFromDrive(env = process.env) {
  const files = await fetchDriveFolderMedia(env)
  syncGalleryItems(files)
}

async function handleGetGallery(req, res, env = process.env) {
  try {
    await refreshGalleryFromDrive(env)
  } catch (error) {
    jsonResponse(res, 503, {
      error: 'Google Drive gallery sync failed',
      message: error.message,
    })
    return
  }

  jsonResponse(res, 200, getGalleryItems())
}

async function handleGetAdminGallery(req, res, env = process.env) {
  if (!requireAdmin(req, res)) {
    return
  }

  try {
    await refreshGalleryFromDrive(env)
  } catch (error) {
    jsonResponse(res, 503, {
      error: 'Google Drive gallery sync failed',
      message: error.message,
    })
    return
  }

  jsonResponse(res, 200, getGalleryItems({ includeHidden: true }))
}

async function handleUpdateGalleryItem(req, res, id) {
  if (!requireAdmin(req, res)) {
    return
  }

  try {
    const body = await readJsonBody(req)
    const updated = updateGalleryItem(id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      hidden: typeof body.hidden === 'boolean' ? body.hidden : undefined,
      thumbnail_data_url:
        typeof body.thumbnail_data_url === 'string' ? body.thumbnail_data_url : undefined,
    })

    if (!updated) {
      jsonResponse(res, 404, { error: 'Gallery item not found' })
      return
    }

    jsonResponse(res, 200, updated)
  } catch (error) {
    jsonResponse(res, 400, { error: 'Unable to update gallery item', message: error.message })
  }
}

async function handleReorderGallery(req, res) {
  if (!requireAdmin(req, res)) {
    return
  }

  try {
    const body = await readJsonBody(req)

    if (!Array.isArray(body.ids)) {
      jsonResponse(res, 400, { error: 'Expected ids array' })
      return
    }

    jsonResponse(res, 200, reorderGalleryItems(body.ids))
  } catch (error) {
    jsonResponse(res, 400, { error: 'Unable to save gallery order', message: error.message })
  }
}

async function fetchDriveFile(id, req, env = process.env) {
  const headers = {}

  if (req.headers.range) {
    headers.Range = req.headers.range
  }

  const drive = getDriveClient(env)

  return drive.files.get(
    {
      fileId: id,
      alt: 'media',
      supportsAllDrives: true,
    },
    {
      headers,
      responseType: 'stream',
    },
  )
}

async function handleStreamMedia(req, res, id, env = process.env) {
  const item = getGalleryItem(id)

  if (!item) {
    jsonResponse(res, 404, { error: 'Gallery media not found' })
    return
  }

  try {
    const driveResponse = await fetchDriveFile(id, req, env)
    const status = driveResponse.status || 200

    if (status >= 400) {
      jsonResponse(res, status, {
        error: 'Unable to stream Google Drive media',
        message: 'Google Drive returned an error while streaming media',
      })
      return
    }

    const headers = {
      'Content-Type': item.mime_type || getResponseHeader(driveResponse.headers, 'content-type') || 'application/octet-stream',
      'Accept-Ranges': getResponseHeader(driveResponse.headers, 'accept-ranges') || 'bytes',
      'Cache-Control': 'public, max-age=3600',
    }

    for (const header of ['content-length', 'content-range']) {
      const value = getResponseHeader(driveResponse.headers, header)

      if (value) {
        headers[header.replace(/\b\w/g, (char) => char.toUpperCase())] = value
      }
    }

    res.writeHead(status, headers)

    if (driveResponse.data) {
      for await (const chunk of driveResponse.data) {
        res.write(chunk)
      }
    }

    res.end()
  } catch (error) {
    jsonResponse(res, 503, {
      error: 'Google Drive media is not connected',
      message: getGoogleDriveErrorMessage(error, 'Unable to stream Google Drive media'),
    })
  }
}

async function handleStreamThumbnail(req, res, id, env = process.env) {
  const item = getGalleryItem(id)

  if (!item?.drive_thumbnail_url) {
    jsonResponse(res, 404, { error: 'Gallery thumbnail not found' })
    return
  }

  try {
    const accessToken = await getDriveAccessToken(env)
    const thumbnailResponse = await fetch(item.drive_thumbnail_url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!thumbnailResponse.ok) {
      const message = await thumbnailResponse.text().catch(() => '')
      jsonResponse(res, thumbnailResponse.status, {
        error: 'Unable to load Google Drive thumbnail',
        message,
      })
      return
    }

    res.writeHead(200, {
      'Content-Type': getResponseHeader(thumbnailResponse.headers, 'content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600',
    })

    if (thumbnailResponse.body) {
      for await (const chunk of thumbnailResponse.body) {
        res.write(chunk)
      }
    }

    res.end()
  } catch (error) {
    jsonResponse(res, 503, {
      error: 'Google Drive thumbnail is not connected',
      message: error.message,
    })
  }
}

async function handleGalleryApi(req, res, env = process.env) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname

  if (req.method === 'GET' && path === '/api/gallery') {
    await handleGetGallery(req, res, env)
    return true
  }

  if (req.method === 'GET' && path === '/api/gallery/admin') {
    await handleGetAdminGallery(req, res, env)
    return true
  }

  if (req.method === 'POST' && path === '/api/gallery/reorder') {
    await handleReorderGallery(req, res)
    return true
  }

  const mediaMatch = path.match(/^\/api\/gallery\/media\/([^/]+)$/)

  if (req.method === 'GET' && mediaMatch) {
    await handleStreamMedia(req, res, mediaMatch[1], env)
    return true
  }

  const thumbnailMatch = path.match(/^\/api\/gallery\/thumbnail\/([^/]+)$/)

  if (req.method === 'GET' && thumbnailMatch) {
    await handleStreamThumbnail(req, res, thumbnailMatch[1], env)
    return true
  }

  const itemMatch = path.match(/^\/api\/gallery\/items\/([^/]+)$/)

  if (req.method === 'PATCH' && itemMatch) {
    await handleUpdateGalleryItem(req, res, itemMatch[1])
    return true
  }

  return false
}

function createGalleryApiMiddleware(env = process.env) {
  return async function galleryApiMiddleware(req, res, next) {
    if (await handleGalleryApi(req, res, env)) {
      return
    }

    next()
  }
}

export { createGalleryApiMiddleware, handleGalleryApi }
