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
    if (process.env.RAILWAY_ENVIRONMENT && !dbPath.startsWith('/data/')) {
      console.warn(
        'GALLERY_DB_PATH is not under /data. Mount a Railway volume at /data and set GALLERY_DB_PATH=/data/gallery.sqlite so jobs persist across deploys.',
      )
    }

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
        notification_sent INTEGER NOT NULL DEFAULT 0,
        notification_error TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS time_clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        billing_type TEXT NOT NULL DEFAULT 'recurring_monthly',
        monthly_payment REAL NOT NULL DEFAULT 0,
        monthly_expected_hours REAL NOT NULL DEFAULT 0,
        target_hourly_rate REAL NOT NULL DEFAULT 75,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        project_name TEXT NOT NULL,
        editing_start_date TEXT NOT NULL,
        editing_end_date TEXT,
        filming_hours REAL NOT NULL DEFAULT 0,
        driving_hours REAL NOT NULL DEFAULT 0,
        editing_hours REAL NOT NULL DEFAULT 0,
        project_fee REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES time_clients(id) ON DELETE CASCADE
      );
    `)

    migrateGalleryItems()
    migrateJobApplications()
    migrateTimeTracker()
    seedTimeTracker()

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

function migrateJobApplications() {
  const columns = getDb()
    .prepare('PRAGMA table_info(job_applications)')
    .all()
    .map((column) => column.name)

  const migrations = [
    [
      'notification_sent',
      'ALTER TABLE job_applications ADD COLUMN notification_sent INTEGER NOT NULL DEFAULT 0',
    ],
    ['notification_error', 'ALTER TABLE job_applications ADD COLUMN notification_error TEXT'],
  ]

  for (const [columnName, statement] of migrations) {
    if (!columns.includes(columnName)) {
      getDb().exec(statement)
    }
  }
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

function migrateTimeTracker() {
  const database = getDb()
  const clientColumns = database
    .prepare('PRAGMA table_info(time_clients)')
    .all()
    .map((column) => column.name)
  const entryColumns = database
    .prepare('PRAGMA table_info(time_entries)')
    .all()
    .map((column) => column.name)

  const clientMigrations = [
    ['billing_type', "ALTER TABLE time_clients ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'recurring_monthly'"],
    ['monthly_expected_hours', 'ALTER TABLE time_clients ADD COLUMN monthly_expected_hours REAL NOT NULL DEFAULT 0'],
  ]
  const entryMigrations = [
    ['project_fee', 'ALTER TABLE time_entries ADD COLUMN project_fee REAL NOT NULL DEFAULT 0'],
  ]

  for (const [columnName, statement] of clientMigrations) {
    if (!clientColumns.includes(columnName)) {
      database.exec(statement)
    }
  }

  for (const [columnName, statement] of entryMigrations) {
    if (!entryColumns.includes(columnName)) {
      database.exec(statement)
    }
  }

  database
    .prepare(
      `
        UPDATE time_clients
        SET monthly_expected_hours =
          CASE
            WHEN monthly_expected_hours > 0 THEN monthly_expected_hours
            WHEN target_hourly_rate > 0 THEN monthly_payment / target_hourly_rate
            ELSE 0
          END
      `,
    )
    .run()
}

const carlyTimeSeedEntries = [
  ['Tiny home tour compilation', '2026-05-11', '2026-05-19', 0, 0, 15, ''],
  ['Trees/ Site prep LF (Blue Bird)', '2026-05-19', '2026-05-22', 3, 2.5, 3.5, ''],
  ['Raw Shady Oaks Video (all 3 parts)', '2026-05-15', '2026-06-26', 4, 2.5, 14.5, ''],
  ['Trees site prep teaser video', '2026-05-23', '2026-05-23', 0, 0, 1, ''],
  ['THT Tree costs', '2026-05-23', '2026-05-24', 0.25, 0, 3.25, ''],
  ['Luxury Bathrooms', '2026-06-06', '2026-06-07', 0, 0, 2.5, ''],
  ['Outdoor Spaces', '2026-06-21', '2026-06-22', 0, 0, 3.5, ''],
  ['Bob Hollow Short', '2026-06-17', '2026-06-17', 0, 0, 1, ''],
  ['Bob Hollow Property Tour', '2026-06-16', '2026-06-16', 0, 0, 3.5, ''],
  ['Bob Hollow Tour Teaser', '2026-06-17', '2026-06-17', 0, 0, 1, ''],
  ['Tour Compilation Short', '2026-05-29', '2026-05-29', 0, 0, 2, ''],
  [
    'Tiny House Kitchens',
    '2026-06-26',
    '2026-06-28',
    3,
    2,
    4,
    'Extra time from manually searching Google Drive for all 7 videos, plus driving and voice over time.',
  ],
  ['Amy Part 2', '2026-06-28', '2026-07-02', 1, 2, 7, ''],
]

function seedTimeTracker() {
  const database = getDb()
  const count = database.prepare('SELECT COUNT(*) AS count FROM time_clients').get().count

  if (count > 0) {
    return
  }

  const clientResult = database
    .prepare(
      `
        INSERT INTO time_clients
          (name, billing_type, monthly_payment, monthly_expected_hours, target_hourly_rate)
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run('Builds By Carly', 'recurring_monthly', 1600, 1600 / 75, 75)
  const clientId = clientResult.lastInsertRowid
  const insertEntry = database.prepare(
    `
      INSERT INTO time_entries
        (
          client_id,
          project_name,
          editing_start_date,
          editing_end_date,
          filming_hours,
          driving_hours,
          editing_hours,
          project_fee,
          notes
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )

  for (const entry of carlyTimeSeedEntries) {
    insertEntry.run(clientId, ...entry.slice(0, 6), 0, entry[6])
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

function mapJobApplication(row) {
  return {
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
    notification_sent: Boolean(row.notification_sent),
    notification_error: row.notification_error || '',
    created_at: row.created_at,
  }
}

function getJobApplication(id) {
  const row = getDb()
    .prepare(
      `
        SELECT
          job_applications.*,
          jobs.title AS job_title
        FROM job_applications
        JOIN jobs ON jobs.id = job_applications.job_id
        WHERE job_applications.id = ?
      `,
    )
    .get(id)

  return row ? mapJobApplication(row) : null
}

function updateJobApplicationNotification(id, { sent, error = '' }) {
  getDb()
    .prepare(
      `
        UPDATE job_applications
        SET notification_sent = ?, notification_error = ?
        WHERE id = ?
      `,
    )
    .run(sent ? 1 : 0, error || null, id)
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
    .map(mapJobApplication)
}

function getMonthKey(dateString) {
  return String(dateString || '').slice(0, 7)
}

function getMonthLabel(monthKey) {
  const [year, month] = String(monthKey || '')
    .split('-')
    .map(Number)

  if (!year || !month) {
    return 'No month'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function mapTimeClient(row) {
  return {
    id: row.id,
    name: row.name,
    billingType: row.billing_type || 'recurring_monthly',
    monthlyPayment: Number(row.monthly_payment) || 0,
    monthlyExpectedHours: Number(row.monthly_expected_hours) || 0,
    targetHourlyRate: Number(row.target_hourly_rate) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTimeEntry(row) {
  const filmingHours = Number(row.filming_hours) || 0
  const drivingHours = Number(row.driving_hours) || 0
  const editingHours = Number(row.editing_hours) || 0
  const projectFee = Number(row.project_fee) || 0
  const totalHours = filmingHours + drivingHours + editingHours

  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name || '',
    projectName: row.project_name,
    editingStartDate: row.editing_start_date,
    editingEndDate: row.editing_end_date || '',
    filmingHours,
    drivingHours,
    editingHours,
    totalHours,
    projectFee,
    effectiveHourlyRate: projectFee && totalHours ? projectFee / totalHours : null,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getTimeClients() {
  return getDb()
    .prepare('SELECT * FROM time_clients ORDER BY name COLLATE NOCASE ASC, id ASC')
    .all()
    .map(mapTimeClient)
}

function getTimeClient(id) {
  const row = getDb().prepare('SELECT * FROM time_clients WHERE id = ?').get(id)
  return row ? mapTimeClient(row) : null
}

function createTimeClient({ name, billingType, monthlyPayment, monthlyExpectedHours, targetHourlyRate }) {
  const result = getDb()
    .prepare(
      `
        INSERT INTO time_clients
          (name, billing_type, monthly_payment, monthly_expected_hours, target_hourly_rate)
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(name, billingType, monthlyPayment, monthlyExpectedHours, targetHourlyRate)

  return getTimeClient(result.lastInsertRowid)
}

function updateTimeClient(id, { name, billingType, monthlyPayment, monthlyExpectedHours, targetHourlyRate }) {
  const existing = getTimeClient(id)

  if (!existing) {
    return null
  }

  getDb()
    .prepare(
      `
        UPDATE time_clients
        SET
          name = ?,
          billing_type = ?,
          monthly_payment = ?,
          monthly_expected_hours = ?,
          target_hourly_rate = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(
      name ?? existing.name,
      billingType ?? existing.billingType,
      monthlyPayment ?? existing.monthlyPayment,
      monthlyExpectedHours ?? existing.monthlyExpectedHours,
      targetHourlyRate ?? existing.targetHourlyRate,
      id,
    )

  return getTimeClient(id)
}

function deleteTimeClient(id) {
  const result = getDb().prepare('DELETE FROM time_clients WHERE id = ?').run(id)
  return result.changes > 0
}

function getTimeEntries({ clientId } = {}) {
  const params = []
  let whereClause = ''

  if (clientId) {
    whereClause = 'WHERE time_entries.client_id = ?'
    params.push(clientId)
  }

  return getDb()
    .prepare(
      `
        SELECT
          time_entries.*,
          time_clients.name AS client_name
        FROM time_entries
        JOIN time_clients ON time_clients.id = time_entries.client_id
        ${whereClause}
        ORDER BY time_entries.editing_start_date DESC, time_entries.id DESC
      `,
    )
    .all(...params)
    .map(mapTimeEntry)
}

function getTimeEntry(id) {
  const row = getDb()
    .prepare(
      `
        SELECT
          time_entries.*,
          time_clients.name AS client_name
        FROM time_entries
        JOIN time_clients ON time_clients.id = time_entries.client_id
        WHERE time_entries.id = ?
      `,
    )
    .get(id)

  return row ? mapTimeEntry(row) : null
}

function createTimeEntry(payload) {
  const result = getDb()
    .prepare(
      `
        INSERT INTO time_entries
          (
            client_id,
            project_name,
            editing_start_date,
            editing_end_date,
            filming_hours,
            driving_hours,
            editing_hours,
            project_fee,
            notes
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      payload.clientId,
      payload.projectName,
      payload.editingStartDate,
      payload.editingEndDate || '',
      payload.filmingHours,
      payload.drivingHours,
      payload.editingHours,
      payload.projectFee,
      payload.notes || '',
    )

  return getTimeEntry(result.lastInsertRowid)
}

function updateTimeEntry(id, payload) {
  const existing = getTimeEntry(id)

  if (!existing) {
    return null
  }

  getDb()
    .prepare(
      `
        UPDATE time_entries
        SET
          client_id = ?,
          project_name = ?,
          editing_start_date = ?,
          editing_end_date = ?,
          filming_hours = ?,
          driving_hours = ?,
          editing_hours = ?,
          project_fee = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    )
    .run(
      payload.clientId ?? existing.clientId,
      payload.projectName ?? existing.projectName,
      payload.editingStartDate ?? existing.editingStartDate,
      payload.editingEndDate ?? existing.editingEndDate,
      payload.filmingHours ?? existing.filmingHours,
      payload.drivingHours ?? existing.drivingHours,
      payload.editingHours ?? existing.editingHours,
      payload.projectFee ?? existing.projectFee,
      payload.notes ?? existing.notes,
      id,
    )

  return getTimeEntry(id)
}

function deleteTimeEntry(id) {
  const result = getDb().prepare('DELETE FROM time_entries WHERE id = ?').run(id)
  return result.changes > 0
}

function summarizeTimeClient(client, entries) {
  const isRecurring = client.billingType === 'recurring_monthly'
  const thresholdHours = isRecurring ? client.monthlyExpectedHours : 0
  const monthMap = new Map()

  for (const entry of entries) {
    const monthKey = getMonthKey(entry.editingStartDate)
    const month = monthMap.get(monthKey) || {
      key: monthKey,
      label: getMonthLabel(monthKey),
      hours: 0,
      projects: 0,
      revenue: 0,
    }

    month.hours += entry.totalHours
    month.projects += 1
    month.revenue += isRecurring ? 0 : entry.projectFee
    monthMap.set(monthKey, month)
  }

  const months = [...monthMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((month) => {
      const revenue = isRecurring ? client.monthlyPayment : month.revenue

      return {
        ...month,
        revenue,
        effectiveHourlyRate: month.hours ? revenue / month.hours : null,
        thresholdDelta: month.hours - thresholdHours,
        overThreshold: isRecurring && thresholdHours > 0 ? month.hours > thresholdHours : false,
      }
    })

  const totalHours = entries.reduce((sum, entry) => sum + entry.totalHours, 0)
  const totalRevenue = isRecurring
    ? months.reduce((sum, month) => sum + month.revenue, 0)
    : entries.reduce((sum, entry) => sum + entry.projectFee, 0)
  const activeMonths = months.filter((month) => month.hours > 0).length

  return {
    ...client,
    isRecurring,
    thresholdHours,
    totalHours,
    totalRevenue,
    projectCount: entries.length,
    averageEffectiveHourlyRate: totalHours ? totalRevenue / totalHours : null,
    lastEntry: entries[0] || null,
    months,
    entries,
  }
}

function getTimeTrackerDashboard() {
  const clients = getTimeClients()
  const entries = getTimeEntries()
  const entriesByClient = new Map()

  for (const entry of entries) {
    entriesByClient.set(entry.clientId, [...(entriesByClient.get(entry.clientId) || []), entry])
  }

  const clientSummaries = clients.map((client) =>
    summarizeTimeClient(client, entriesByClient.get(client.id) || []),
  )
  const totalHours = clientSummaries.reduce((sum, client) => sum + client.totalHours, 0)

  return {
    clients: clientSummaries,
    totalHours,
    entryCount: entries.length,
  }
}

export {
  createJob,
  createJobApplication,
  createAdminSession,
  createTimeClient,
  createTimeEntry,
  deleteAdminSession,
  deleteJob,
  deleteTimeClient,
  deleteTimeEntry,
  getFirstGalleryItem,
  getAdminSession,
  getGalleryItem,
  getGalleryItems,
  getJob,
  getJobApplication,
  getJobApplications,
  getJobs,
  getTimeClient,
  getTimeClients,
  getTimeEntry,
  getTimeEntries,
  getTimeTrackerDashboard,
  reorderGalleryItems,
  syncGalleryItems,
  updateJobApplicationNotification,
  updateJob,
  updateGalleryItem,
  updateTimeClient,
  updateTimeEntry,
}
