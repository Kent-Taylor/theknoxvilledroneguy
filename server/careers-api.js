import {
  createJob,
  createJobApplication,
  deleteJob,
  getJob,
  getJobApplications,
  getJobs,
  updateJob,
} from './gallery-db.js'
import { requireAdmin } from './google-auth.js'

const ACCEPTED_RESUME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])
const MAX_RESUME_BYTES = 5 * 1024 * 1024

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

function cleanText(value) {
  return String(value || '').trim()
}

function validateJobPayload(body) {
  const title = cleanText(body.title)
  const description = cleanText(body.description)

  if (!title || !description) {
    throw new Error('Job title and description are required')
  }

  return { title, description }
}

function getDataUrlBytes(dataUrl) {
  const [, base64 = ''] = String(dataUrl || '').split(',')
  return Math.ceil((base64.length * 3) / 4)
}

function validateApplicationPayload(job, body) {
  if (!job) {
    throw new Error('Job posting not found')
  }

  const payload = {
    name: cleanText(body.name),
    age: cleanText(body.age),
    city: cleanText(body.city),
    state: cleanText(body.state),
    instagram: cleanText(body.instagram),
    tiktok: cleanText(body.tiktok),
    resume_name: cleanText(body.resume_name),
    resume_type: cleanText(body.resume_type),
    resume_data_url: String(body.resume_data_url || ''),
  }

  if (!payload.name || !payload.age || !payload.city || !payload.state) {
    throw new Error('Name, age, city, and state are required')
  }

  if (!payload.resume_name || !payload.resume_data_url) {
    throw new Error('Resume upload is required')
  }

  if (!ACCEPTED_RESUME_TYPES.has(payload.resume_type)) {
    throw new Error('Resume must be a PDF, PNG, JPG, or JPEG file')
  }

  if (getDataUrlBytes(payload.resume_data_url) > MAX_RESUME_BYTES) {
    throw new Error('Resume must be 5 MB or smaller')
  }

  return payload
}

async function handleCareersApi(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname

  if (req.method === 'GET' && path === '/api/jobs') {
    jsonResponse(res, 200, getJobs())
    return true
  }

  if (req.method === 'GET' && path === '/api/jobs/applications') {
    if (!requireAdmin(req, res)) {
      return true
    }

    jsonResponse(res, 200, getJobApplications())
    return true
  }

  if (req.method === 'POST' && path === '/api/jobs') {
    if (!requireAdmin(req, res)) {
      return true
    }

    try {
      jsonResponse(res, 201, createJob(validateJobPayload(await readJsonBody(req))))
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to create job', message: error.message })
    }

    return true
  }

  const jobMatch = path.match(/^\/api\/jobs\/(\d+)$/)

  if (jobMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) {
      return true
    }

    try {
      const updated = updateJob(Number(jobMatch[1]), validateJobPayload(await readJsonBody(req)))

      if (!updated) {
        jsonResponse(res, 404, { error: 'Job posting not found' })
        return true
      }

      jsonResponse(res, 200, updated)
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to update job', message: error.message })
    }

    return true
  }

  if (jobMatch && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) {
      return true
    }

    if (!deleteJob(Number(jobMatch[1]))) {
      jsonResponse(res, 404, { error: 'Job posting not found' })
      return true
    }

    jsonResponse(res, 200, { ok: true })
    return true
  }

  const applyMatch = path.match(/^\/api\/jobs\/(\d+)\/apply$/)

  if (applyMatch && req.method === 'POST') {
    try {
      const job = getJob(Number(applyMatch[1]))
      const application = createJobApplication(
        Number(applyMatch[1]),
        validateApplicationPayload(job, await readJsonBody(req)),
      )
      jsonResponse(res, 201, application)
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to submit application', message: error.message })
    }

    return true
  }

  return false
}

export { handleCareersApi }
