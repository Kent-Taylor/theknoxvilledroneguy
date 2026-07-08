import {
  createTimeClient,
  createTimeEntry,
  deleteTimeClient,
  deleteTimeEntry,
  getTimeClient,
  getTimeEntry,
  getTimeTrackerDashboard,
  updateTimeClient,
  updateTimeEntry,
} from './gallery-db.js'
import { requireAdmin } from './google-auth.js'

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

function cleanNumber(value, fieldName) {
  const number = Number(value || 0)

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${fieldName} must be zero or greater`)
  }

  return number
}

function validateClientPayload(body) {
  const name = cleanText(body.name)
  const billingType =
    body.billingType === 'project_based' ? 'project_based' : 'recurring_monthly'
  const isRecurring = billingType === 'recurring_monthly'
  const monthlyPayment = isRecurring ? cleanNumber(body.monthlyPayment, 'Monthly payment') : 0
  const monthlyExpectedHours = isRecurring
    ? cleanNumber(body.monthlyExpectedHours, 'Expected monthly hours')
    : 0
  const targetHourlyRate = cleanNumber(body.targetHourlyRate || 75, 'Target hourly rate')

  if (!name) {
    throw new Error('Client name is required')
  }

  if (isRecurring && monthlyExpectedHours <= 0) {
    throw new Error('Expected monthly hours must be greater than zero')
  }

  if (targetHourlyRate <= 0) {
    throw new Error('Target hourly rate must be greater than zero')
  }

  return { name, billingType, monthlyPayment, monthlyExpectedHours, targetHourlyRate }
}

function validateEntryPayload(body) {
  const clientId = Number.parseInt(body.clientId, 10)
  const client = Number.isInteger(clientId) ? getTimeClient(clientId) : null
  const projectName = cleanText(body.projectName)
  const editingStartDate = cleanText(body.editingStartDate)
  const editingEndDate = cleanText(body.editingEndDate)

  if (!client) {
    throw new Error('Choose a valid client')
  }

  if (!projectName) {
    throw new Error('Project name is required')
  }

  if (!editingStartDate) {
    throw new Error('Editing start date is required')
  }

  return {
    clientId,
    projectName,
    editingStartDate,
    editingEndDate,
    filmingHours: cleanNumber(body.filmingHours, 'Filming hours'),
    drivingHours: cleanNumber(body.drivingHours, 'Driving hours'),
    editingHours: cleanNumber(body.editingHours, 'Editing hours'),
    projectFee:
      client.billingType === 'project_based' ? cleanNumber(body.projectFee, 'Project fee') : 0,
    notes: cleanText(body.notes),
  }
}

async function handleTimeTrackerApi(req, res) {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname

  if (!path.startsWith('/api/time-tracker')) {
    return false
  }

  if (!requireAdmin(req, res)) {
    return true
  }

  if (req.method === 'GET' && path === '/api/time-tracker') {
    jsonResponse(res, 200, getTimeTrackerDashboard())
    return true
  }

  if (req.method === 'POST' && path === '/api/time-tracker/clients') {
    try {
      jsonResponse(res, 201, createTimeClient(validateClientPayload(await readJsonBody(req))))
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to create client', message: error.message })
    }

    return true
  }

  const clientMatch = path.match(/^\/api\/time-tracker\/clients\/(\d+)$/)

  if (clientMatch && req.method === 'PATCH') {
    try {
      const updated = updateTimeClient(
        Number(clientMatch[1]),
        validateClientPayload(await readJsonBody(req)),
      )

      if (!updated) {
        jsonResponse(res, 404, { error: 'Client not found' })
        return true
      }

      jsonResponse(res, 200, updated)
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to update client', message: error.message })
    }

    return true
  }

  if (clientMatch && req.method === 'DELETE') {
    if (!deleteTimeClient(Number(clientMatch[1]))) {
      jsonResponse(res, 404, { error: 'Client not found' })
      return true
    }

    jsonResponse(res, 200, { ok: true })
    return true
  }

  if (req.method === 'POST' && path === '/api/time-tracker/entries') {
    try {
      jsonResponse(res, 201, createTimeEntry(validateEntryPayload(await readJsonBody(req))))
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to create entry', message: error.message })
    }

    return true
  }

  const entryMatch = path.match(/^\/api\/time-tracker\/entries\/(\d+)$/)

  if (entryMatch && req.method === 'PATCH') {
    try {
      const updated = updateTimeEntry(
        Number(entryMatch[1]),
        validateEntryPayload(await readJsonBody(req)),
      )

      if (!updated) {
        jsonResponse(res, 404, { error: 'Entry not found' })
        return true
      }

      jsonResponse(res, 200, updated)
    } catch (error) {
      jsonResponse(res, 400, { error: 'Unable to update entry', message: error.message })
    }

    return true
  }

  if (entryMatch && req.method === 'DELETE') {
    if (!getTimeEntry(Number(entryMatch[1])) || !deleteTimeEntry(Number(entryMatch[1]))) {
      jsonResponse(res, 404, { error: 'Entry not found' })
      return true
    }

    jsonResponse(res, 200, { ok: true })
    return true
  }

  jsonResponse(res, 404, { error: 'Time tracker route not found' })
  return true
}

export { handleTimeTrackerApi }
