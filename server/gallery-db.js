import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const defaultDbPath = join(process.cwd(), 'data', 'gallery.sqlite')

const seedItems = [
  ['1AmS9IqeqBgZ1hWhQwfXbmut5f7SrGryS', 'Weigles', 'VIDEO', 'video/mp4', '2026-05-30T18:54:56.000Z', 0],
  [
    '1puVvMs4tmyS0EVQuQQl_IzPjpWKPaTq5',
    'Behind the scenes FPV drone at Big Air',
    'VIDEO',
    'video/mp4',
    '2026-04-25T20:07:31.000Z',
    1,
  ],
  ['13DbSMKN4qbow_iQKtd8gbNBjsHb1Hdqo', 'Draft 1', 'VIDEO', 'video/mp4', '2026-04-17T02:46:03.000Z', 2],
  [
    '1p7-k1VNExu0M7rqDbff-Avf3nTyuDQVV',
    'Screen recording',
    'VIDEO',
    'video/mp4',
    '2026-03-08T14:11:38.157Z',
    3,
  ],
  [
    '1vVrdrgdV2gpTJuk_zKbLO7syxjo-02jS',
    'Stake conference intro',
    'VIDEO',
    'video/quicktime',
    '2026-03-08T13:14:12.000Z',
    4,
  ],
  [
    '1Mwr8Du2IY0iUDIy843Fr41ul3z1yztvd',
    'Temp video for share',
    'VIDEO',
    'video/mp4',
    '2026-02-21T13:22:42.503Z',
    5,
  ],
  ['1ensQqPsQJjlMACHeWHY0SDPOR6_kjGnN', 'Clip 1', 'VIDEO', 'video/mp4', '2026-02-21T13:01:19.831Z', 6],
  ['1KxYsacqmXqfYYbP1R7-nYAjhlGn4-0yn', 'HD edit', 'VIDEO', 'video/mp4', '2026-02-21T11:35:39.000Z', 7],
  [
    '1o8ztxHAk-4I7fMULK0sfLIPH966kOJSE',
    'D-Log stabilized drone clip',
    'VIDEO',
    'video/mp4',
    '2026-02-21T07:30:04.000Z',
    8,
  ],
  [
    '1db9Fgy-2W5RUOvKQnSsQ9dSAIAcwKC8P',
    'D-Log drone clip',
    'VIDEO',
    'video/mp4',
    '2026-02-21T07:20:14.944Z',
    9,
  ],
  [
    '1KS04XLyBq86xSppCHz0Vyh2wEPK9Hg5D',
    'Construction progress 2026',
    'VIDEO',
    'video/mp4',
    '2026-02-09T23:19:02.000Z',
    10,
  ],
  [
    '16DyVX8L78PTXSAyYLqiCZRVyG_9B-xe7',
    'Worlds Fair Park',
    'VIDEO',
    'video/mp4',
    '2026-02-08T18:22:11.796Z',
    11,
  ],
]

let db

function getDb() {
  const dbPath = process.env.GALLERY_DB_PATH || defaultDbPath

  if (!existsSync(dirname(dbPath))) {
    mkdirSync(dirname(dbPath), { recursive: true })
  }

  if (!db) {
    db = new DatabaseSync(dbPath)
    db.exec('PRAGMA foreign_keys = ON;')
    db.exec(`
      CREATE TABLE IF NOT EXISTS gallery_items (
        drive_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        media_type TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        timestamp TEXT,
        width INTEGER,
        height INTEGER,
        duration_millis INTEGER,
        drive_thumbnail_url TEXT,
        sort_order INTEGER NOT NULL,
        manual_order INTEGER NOT NULL DEFAULT 0,
        hidden INTEGER NOT NULL DEFAULT 0,
        thumbnail_data_url TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_sessions (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        picture TEXT,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS job_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        age TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        instagram TEXT,
        tiktok TEXT,
        resume_name TEXT NOT NULL,
        resume_type TEXT NOT NULL,
        resume_data_url TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );
    `)

    migrateGalleryItems()

    const count = db.prepare('SELECT COUNT(*) AS count FROM gallery_items').get().count

    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO gallery_items
          (drive_id, title, media_type, mime_type, timestamp, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      for (const item of seedItems) {
        insert.run(...item)
      }
    }
  }

  return db
}

function migrateGalleryItems() {
  const columns = getDb()
    .prepare('PRAGMA table_info(gallery_items)')
    .all()
    .map((column) => column.name)

  const migrations = [
    ['width', 'ALTER TABLE gallery_items ADD COLUMN width INTEGER'],
    ['height', 'ALTER TABLE gallery_items ADD COLUMN height INTEGER'],
    ['duration_millis', 'ALTER TABLE gallery_items ADD COLUMN duration_millis INTEGER'],
    ['drive_thumbnail_url', 'ALTER TABLE gallery_items ADD COLUMN drive_thumbnail_url TEXT'],
    ['manual_order', 'ALTER TABLE gallery_items ADD COLUMN manual_order INTEGER NOT NULL DEFAULT 0'],
  ]

  for (const [columnName, statement] of migrations) {
    if (!columns.includes(columnName)) {
      getDb().exec(statement)
    }
  }
}

function getAspectRatio(item) {
  if (!item.width || !item.height) {
    return ''
  }

  return `${item.width} / ${item.height}`
}

function getOrientation(item) {
  if (!item.width || !item.height) {
    return 'square'
  }

  if (item.height > item.width * 1.1) {
    return 'portrait'
  }

  if (item.width > item.height * 1.1) {
    return 'landscape'
  }

  return 'square'
}

function titleize(value) {
  const acronyms = new Set(['BTS', 'FAA', 'FPV', 'HD', 'MLS', 'RAW'])
  const smallWords = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with'])
  const words = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')

  return words
    .map((word, index) => {
      const cleanWord = word.replace(/[^a-z0-9]/gi, '')
      const upperWord = cleanWord.toUpperCase()
      const lowerWord = word.toLowerCase()

      if (acronyms.has(upperWord)) {
        return word.replace(cleanWord, upperWord)
      }

      if (index > 0 && smallWords.has(lowerWord)) {
        return lowerWord
      }

      return lowerWord.replace(/(^|[-'’])([a-z])/g, (match, prefix, char) => `${prefix}${char.toUpperCase()}`)
    })
    .join(' ')
}

function mapItem(item, includeHidden = false) {
  if (!includeHidden && item.hidden) {
    return null
  }

  return {
    id: item.drive_id,
    title: item.media_type === 'VIDEO' ? titleize(item.title) : item.title,
    media_type: item.media_type,
    mime_type: item.mime_type,
    timestamp: item.timestamp,
    width: item.width || null,
    height: item.height || null,
    duration_millis: item.duration_millis || null,
    aspect_ratio: getAspectRatio(item),
    orientation: getOrientation(item),
    hidden: Boolean(item.hidden),
    thumbnail_data_url: item.thumbnail_data_url || '',
    drive_thumbnail_url: item.drive_thumbnail_url || '',
    media_url: `/api/gallery/media/${item.drive_id}`,
    thumbnail_url:
      item.thumbnail_data_url || (item.drive_thumbnail_url ? `/api/gallery/thumbnail/${item.drive_id}` : ''),
  }
}

function getGalleryItems({ includeHidden = false } = {}) {
  const rows = getDb()
    .prepare(
      `
        SELECT * FROM gallery_items
        ORDER BY
          sort_order ASC,
          timestamp DESC
      `,
    )
    .all()

  return rows.map((item) => mapItem(item, includeHidden)).filter(Boolean)
}

function getGalleryItem(id) {
  return getDb().prepare('SELECT * FROM gallery_items WHERE drive_id = ?').get(id)
}

function getFirstGalleryItem() {
  return getDb()
    .prepare(
      `
        SELECT * FROM gallery_items
        ORDER BY
          sort_order ASC,
          timestamp DESC
        LIMIT 1
      `,
    )
    .get()
}

function updateGalleryItem(id, updates) {
  const existing = getGalleryItem(id)

  if (!existing) {
    return null
  }

  getDb()
    .prepare(
      `
        UPDATE gallery_items
        SET title = ?, hidden = ?, thumbnail_data_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE drive_id = ?
      `,
    )
    .run(
      updates.title ?? existing.title,
      updates.hidden === undefined ? existing.hidden : Number(Boolean(updates.hidden)),
      updates.thumbnail_data_url === undefined
        ? existing.thumbnail_data_url
        : updates.thumbnail_data_url,
      id,
    )

  return getGalleryItem(id)
}

function reorderGalleryItems(ids) {
  const update = getDb().prepare(
    'UPDATE gallery_items SET sort_order = ?, manual_order = 1 WHERE drive_id = ?',
  )

  ids.forEach((id, index) => {
    update.run(index, id)
  })

  return getGalleryItems({ includeHidden: true })
}

function titleFromFileName(name) {
  const withoutExtension = name.replace(/\.[^.]+$/, '')
  const withSpaces = withoutExtension.replace(/[-_]+/g, ' ').trim()

  return titleize(withSpaces || name)
}

function syncGalleryItems(files) {
  const database = getDb()
  const existingRows = database.prepare('SELECT * FROM gallery_items').all()
  const existingById = new Map(existingRows.map((item) => [item.drive_id, item]))
  const existingIds = new Set(existingRows.map((item) => item.drive_id))
  const newIds = new Set(files.filter((file) => !existingIds.has(file.id)).map((file) => file.id))
  let nextNewSortOrder = 0

  if (newIds.size > 0) {
    database.prepare('UPDATE gallery_items SET sort_order = sort_order + ?').run(newIds.size)
  }

  const insert = database.prepare(`
    INSERT INTO gallery_items
      (drive_id, title, media_type, mime_type, timestamp, width, height, duration_millis, drive_thumbnail_url, sort_order, manual_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const update = database.prepare(`
    UPDATE gallery_items
    SET media_type = ?,
        mime_type = ?,
        timestamp = ?,
        width = ?,
        height = ?,
        duration_millis = ?,
        drive_thumbnail_url = ?,
        sort_order = CASE WHEN manual_order = 1 THEN sort_order ELSE ? END,
        manual_order = CASE WHEN ? = 1 THEN 1 ELSE manual_order END,
        updated_at = CURRENT_TIMESTAMP
    WHERE drive_id = ?
  `)

  files.forEach((file, index) => {
    const existing = existingById.get(file.id)

    if (existing) {
      update.run(
        file.mediaType,
        file.mimeType,
        file.timestamp,
        file.width,
        file.height,
        file.durationMillis,
        file.thumbnailLink,
        index,
        newIds.has(file.id) ? 1 : 0,
        file.id,
      )
      return
    }

    insert.run(
      file.id,
      titleFromFileName(file.name),
      file.mediaType,
      file.mimeType,
      file.timestamp,
      file.width,
      file.height,
      file.durationMillis,
      file.thumbnailLink,
      nextNewSortOrder,
      1,
    )
    nextNewSortOrder += 1
  })

  const fileIds = new Set(files.map((file) => file.id))
  const remove = database.prepare('DELETE FROM gallery_items WHERE drive_id = ?')

  for (const existing of existingRows) {
    if (!fileIds.has(existing.drive_id)) {
      remove.run(existing.drive_id)
    }
  }

  return getGalleryItems({ includeHidden: true })
}

function createAdminSession({ token, email, name, picture, expiresAt }) {
  getDb()
    .prepare(
      `
        INSERT OR REPLACE INTO admin_sessions
          (token, email, name, picture, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(token, email, name || '', picture || '', expiresAt)
}

function getAdminSession(token) {
  if (!token) {
    return null
  }

  const session = getDb()
    .prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > ?')
    .get(token, Date.now())

  return session || null
}

function deleteAdminSession(token) {
  if (token) {
    getDb().prepare('DELETE FROM admin_sessions WHERE token = ?').run(token)
  }
}

function mapJob(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function getJobs() {
  return getDb()
    .prepare('SELECT * FROM jobs ORDER BY created_at DESC, id DESC')
    .all()
    .map(mapJob)
}

function getJob(id) {
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id)
  return row ? mapJob(row) : null
}

function createJob({ title, description }) {
  const result = getDb()
    .prepare('INSERT INTO jobs (title, description) VALUES (?, ?)')
    .run(title, description)

  return getJob(result.lastInsertRowid)
}

function updateJob(id, { title, description }) {
  const existing = getJob(id)

  if (!existing) {
    return null
  }

  getDb()
    .prepare(
      `
        UPDATE jobs
        SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(title ?? existing.title, description ?? existing.description, id)

  return getJob(id)
}

function deleteJob(id) {
  const result = getDb().prepare('DELETE FROM jobs WHERE id = ?').run(id)
  return result.changes > 0
}

function createJobApplication(jobId, payload) {
  const result = getDb()
    .prepare(
      `
        INSERT INTO job_applications
          (job_id, name, age, city, state, instagram, tiktok, resume_name, resume_type, resume_data_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      jobId,
      payload.name,
      payload.age,
      payload.city,
      payload.state,
      payload.instagram || '',
      payload.tiktok || '',
      payload.resume_name,
      payload.resume_type,
      payload.resume_data_url,
    )

  return {
    id: result.lastInsertRowid,
    job_id: Number(jobId),
    created_at: new Date().toISOString(),
  }
}

function getJobApplications() {
  return getDb()
    .prepare(
      `
        SELECT
          job_applications.*,
          jobs.title AS job_title
        FROM job_applications
        JOIN jobs ON jobs.id = job_applications.job_id
        ORDER BY job_applications.created_at DESC, job_applications.id DESC
      `,
    )
    .all()
    .map((row) => ({
      id: row.id,
      job_id: row.job_id,
      job_title: row.job_title,
      name: row.name,
      age: row.age,
      city: row.city,
      state: row.state,
      instagram: row.instagram || '',
      tiktok: row.tiktok || '',
      resume_name: row.resume_name,
      resume_type: row.resume_type,
      resume_data_url: row.resume_data_url,
      created_at: row.created_at,
    }))
}

export {
  createJob,
  createJobApplication,
  createAdminSession,
  deleteAdminSession,
  deleteJob,
  getFirstGalleryItem,
  getAdminSession,
  getGalleryItem,
  getGalleryItems,
  getJob,
  getJobApplications,
  getJobs,
  reorderGalleryItems,
  syncGalleryItems,
  updateJob,
  updateGalleryItem,
}
