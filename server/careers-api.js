import {
  createJob,
  createJobApplication,
  deleteJob,
  getJob,
  getJobApplication,
  getJobApplications,
  getJobs,
  updateJobApplicationNotification,
  updateJob,
} from './gallery-db.js'
import { sendApplicationNotification } from './careers-email.js'
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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sanitizeColor(value) {
  const color = cleanText(value).replace(/['"]/g, '')

  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) {
    return color
  }

  if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(color)) {
    return color
  }

  return ''
}

function sanitizeRichText(value) {
  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'ul',
    'ol',
    'li',
    'span',
    'h1',
    'h2',
    'h3',
    'h4',
  ])
  const rawHtml = String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  return rawHtml
    .replace(/<\s*(\/?)\s*font\b([^>]*)>/gi, (_, closing, attrs = '') => {
      if (closing) {
        return '</span>'
      }

      const color = sanitizeColor(attrs.match(/\bcolor\s*=\s*["']?([^"'\s>]+)/i)?.[1])
      return color ? `<span style="color: ${color};">` : '<span>'
    })
    .replace(/<([^>]+)>/g, (match, tagBody) => {
      const trimmed = tagBody.trim()
      const closing = trimmed.startsWith('/')
      const tagName = trimmed.replace(/^\//, '').split(/\s+/)[0].toLowerCase()

      if (!allowedTags.has(tagName)) {
        return escapeHtml(match)
      }

      if (closing) {
        return tagName === 'br' ? '' : `</${tagName}>`
      }

      if (tagName === 'br') {
        return '<br>'
      }

      if (tagName === 'span') {
        const color = sanitizeColor(trimmed.match(/\bcolor\s*:\s*([^;"']+)/i)?.[1])
        return color ? `<span style="color: ${color};">` : '<span>'
      }

      return `<${tagName}>`
    })
    .trim()
}

function decodeAllowedEscapedTags(value) {
  return String(value || '').replace(
    /&lt;\s*(\/?)\s*(h1|h2|h3|h4|p|br|strong|b|em|i|ul|ol|li|span)\b([^&]*)&gt;/gi,
    (_, closing, tagName, attrs = '') => {
      const tag = tagName.toLowerCase()

      if (closing) {
        return tag === 'br' ? '' : `</${tag}>`
      }

      if (tag === 'br') {
        return '<br>'
      }

      if (tag === 'span') {
        const color = sanitizeColor(
          attrs
            .replace(/&quot;/g, '"')
            .match(/\bcolor\s*:\s*([^;"']+)/i)?.[1],
        )
        return color ? `<span style="color: ${color};">` : '<span>'
      }

      return `<${tag}>`
    },
  )
}

function normalizeJob(job) {
  return {
    ...job,
    description: sanitizeRichText(decodeAllowedEscapedTags(job.description)),
  }
}

function getPlainTextFromHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function validateJobPayload(body) {
  const title = cleanText(body.title)
  const description = sanitizeRichText(body.description)

  if (!title || !getPlainTextFromHtml(description)) {
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

  const age = Number.parseInt(payload.age, 10)

  if (!Number.isInteger(age) || age < 14 || age > 120) {
    throw new Error('Enter a valid age')
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
    jsonResponse(res, 200, getJobs().map(normalizeJob))
    return true
  }

  if (req.method === 'GET' && path === '/api/jobs/applications') {
    if (!requireAdmin(req, res)) {
      return true
    }

    jsonResponse(res, 200, getJobApplications())
    return true
  }

  const notificationMatch = path.match(/^\/api\/jobs\/applications\/(\d+)\/notify$/)

  if (notificationMatch && req.method === 'POST') {
    if (!requireAdmin(req, res)) {
      return true
    }

    const application = getJobApplication(Number(notificationMatch[1]))

    if (!application) {
      jsonResponse(res, 404, { error: 'Application not found' })
      return true
    }

    try {
      await sendApplicationNotification({ title: application.job_title }, application)
      updateJobApplicationNotification(application.id, { sent: true })
      jsonResponse(res, 200, {
        ok: true,
        message: `Email notification sent to ${process.env.CAREERS_NOTIFICATION_EMAIL || 'the configured address'}.`,
      })
    } catch (error) {
      updateJobApplicationNotification(application.id, { sent: false, error: error.message })
      console.error(`Career application ${application.id} email retry failed: ${error.message}`)
      jsonResponse(res, 502, {
        error: 'Email notification failed',
        message: error.message,
      })
    }

    return true
  }

  if (req.method === 'POST' && path === '/api/jobs') {
    if (!requireAdmin(req, res)) {
      return true
    }

    try {
      jsonResponse(res, 201, normalizeJob(createJob(validateJobPayload(await readJsonBody(req)))))
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

      jsonResponse(res, 200, normalizeJob(updated))
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
      const applicationPayload = validateApplicationPayload(job, await readJsonBody(req))
      const application = createJobApplication(Number(applyMatch[1]), applicationPayload)
      const applicationDetails = {
        ...application,
        ...applicationPayload,
      }

      try {
        await sendApplicationNotification(job, applicationDetails)
        updateJobApplicationNotification(application.id, { sent: true })
        jsonResponse(res, 201, {
          ok: true,
          message: 'Your application was submitted successfully.',
          notification_sent: true,
        })
      } catch (emailError) {
        updateJobApplicationNotification(application.id, {
          sent: false,
          error: emailError.message,
        })
        console.error(`Career application ${application.id} email failed: ${emailError.message}`)
        jsonResponse(res, 202, {
          ok: true,
          message:
            'Your application was saved successfully, but the email notification could not be sent. The site owner can still review it.',
          notification_sent: false,
        })
      }
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to submit application', message: error.message })
    }

    return true
  }

  return false
}

export { handleCareersApi }
