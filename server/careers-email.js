const RESEND_API_URL = 'https://api.resend.com/emails'
const DEFAULT_NOTIFICATION_EMAIL = 'theknoxvilledroneguy@gmail.com'

function cleanText(value) {
  return String(value || '').trim()
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getEmailConfig(env = process.env) {
  const apiKey = cleanText(env.RESEND_API_KEY)
  const from = cleanText(env.CAREERS_FROM_EMAIL)
  const to = cleanText(env.CAREERS_NOTIFICATION_EMAIL) || DEFAULT_NOTIFICATION_EMAIL

  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }

  if (!from) {
    throw new Error('Missing CAREERS_FROM_EMAIL')
  }

  return { apiKey, from, to }
}

function parseResumeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+);base64,([a-z0-9+/=\s]+)$/i)

  if (!match) {
    throw new Error('Resume data is invalid')
  }

  return {
    content: match[2].replace(/\s/g, ''),
  }
}

function buildEmailText(job, application) {
  return [
    `New application for ${job.title}`,
    '',
    `Name: ${application.name}`,
    `Age: ${application.age}`,
    `Location: ${application.city}, ${application.state}`,
    `Instagram: ${application.instagram || 'Not provided'}`,
    `TikTok: ${application.tiktok || 'Not provided'}`,
    '',
    `Resume attached: ${application.resume_name}`,
  ].join('\n')
}

function buildEmailHtml(job, application) {
  return `
    <h1>New application for ${escapeHtml(job.title)}</h1>
    <p><strong>Name:</strong> ${escapeHtml(application.name)}</p>
    <p><strong>Age:</strong> ${escapeHtml(application.age)}</p>
    <p><strong>Location:</strong> ${escapeHtml(application.city)}, ${escapeHtml(application.state)}</p>
    <p><strong>Instagram:</strong> ${escapeHtml(application.instagram || 'Not provided')}</p>
    <p><strong>TikTok:</strong> ${escapeHtml(application.tiktok || 'Not provided')}</p>
    <p><strong>Resume:</strong> ${escapeHtml(application.resume_name)} (attached)</p>
  `.trim()
}

async function sendApplicationNotification(job, application, env = process.env) {
  const config = getEmailConfig(env)
  const resume = parseResumeDataUrl(application.resume_data_url)
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `career-application-${application.id}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: `New job application: ${job.title} - ${application.name}`,
      text: buildEmailText(job, application),
      html: buildEmailHtml(job, application),
      attachments: [
        {
          filename: application.resume_name,
          content: resume.content,
        },
      ],
    }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.message || `Email provider responded with ${response.status}`)
  }

  return result
}

export { sendApplicationNotification }
