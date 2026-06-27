import sanitizeHtml from 'sanitize-html'
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

function sanitizeRichText(value) {
  const colorPattern =
    /^(?:#[0-9a-f]{3,8}|rgba?\(\s*[\d.%\s,]+\)|hsla?\(\s*[\d.%\s,]+\)|[a-z]+)$/i
  const lengthPattern = /^(?:0|[-+]?\d*\.?\d+(?:px|pt|em|rem|%))$/i

  return sanitizeHtml(String(value || ''), {
    allowedTags: [
      'p',
      'div',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'pre',
      'code',
      'ul',
      'ol',
      'li',
      'span',
      'h1',
      'h2',
      'h3',
      'h4',
      'a',
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'target', 'rel', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowedStyles: {
      '*': {
        color: [colorPattern],
        'background-color': [colorPattern],
        'font-family': [/^[a-z0-9\s,'"-]+$/i],
        'font-size': [/^(?:\d*\.?\d+(?:px|pt|em|rem|%)|small|medium|large|x-large)$/i],
        'font-style': [/^(?:normal|italic|oblique)$/i],
        'font-weight': [/^(?:normal|bold|bolder|lighter|[1-9]00)$/i],
        'letter-spacing': [lengthPattern, /^normal$/i],
        'line-height': [/^(?:normal|\d*\.?\d+(?:px|pt|em|rem|%)?)$/i],
        'list-style-type': [/^[a-z-]+$/i],
        'margin-bottom': [lengthPattern],
        'margin-left': [lengthPattern],
        'margin-right': [lengthPattern],
        'margin-top': [lengthPattern],
        'padding-left': [lengthPattern],
        'text-align': [/^(?:left|center|right|justify|start|end)$/i],
        'text-decoration': [/^(?:none|underline|line-through)(?:\s+(?:underline|line-through))?$/i],
        'text-indent': [lengthPattern],
        'text-transform': [/^(?:none|uppercase|lowercase|capitalize)$/i],
        'white-space': [/^(?:normal|pre|pre-wrap)$/i],
      },
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
      font: (tagName, attribs) => {
        const legacyFontSizes = {
          1: '0.75rem',
          2: '0.875rem',
          3: '1rem',
          4: '1.125rem',
          5: '1.5rem',
          6: '2rem',
          7: '3rem',
        }
        const styles = [
          attribs.color ? `color: ${attribs.color}` : '',
          attribs.face ? `font-family: ${attribs.face}` : '',
          legacyFontSizes[attribs.size] ? `font-size: ${legacyFontSizes[attribs.size]}` : '',
        ].filter(Boolean)

        return {
          tagName: 'span',
          attribs: styles.length ? { style: styles.join('; ') } : {},
        }
      },
    },
    nestingLimit: 30,
  }).trim()
}

function decodeAllowedEscapedTags(value) {
  return String(value || '').replace(
    /&lt;\s*(\/?)\s*(h1|h2|h3|h4|p|div|br|strong|b|em|i|u|s|blockquote|pre|code|ul|ol|li|span|a)\b([\s\S]*?)&gt;/gi,
    (_, closing, tagName, attrs = '') => {
      const tag = tagName.toLowerCase()

      if (closing) {
        return tag === 'br' ? '' : `</${tag}>`
      }

      if (tag === 'br') {
        return '<br>'
      }

      return `<${tag}${attrs.replace(/&quot;/g, '"').replace(/&#039;/g, "'")}>`
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

export { handleCareersApi, sanitizeRichText }
