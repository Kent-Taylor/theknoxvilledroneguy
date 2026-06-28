const SOCIAL_PLATFORMS = {
  instagram: {
    hosts: new Set(['instagram.com', 'www.instagram.com']),
    profileUrl: (username) => `https://www.instagram.com/${encodeURIComponent(username)}/`,
  },
  tiktok: {
    hosts: new Set(['tiktok.com', 'www.tiktok.com']),
    profileUrl: (username) => `https://www.tiktok.com/@${encodeURIComponent(username)}`,
  },
}

function buildSocialProfileUrl(value, platform) {
  const config = SOCIAL_PLATFORMS[platform]
  const trimmed = String(value || '').trim()

  if (!config || !trimmed) {
    return ''
  }

  const possibleUrl = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^(?:www\.)?(?:instagram|tiktok)\.com\//i.test(trimmed)
      ? `https://${trimmed}`
      : ''

  if (possibleUrl) {
    try {
      const url = new URL(possibleUrl)

      if (!config.hosts.has(url.hostname.toLowerCase())) {
        return ''
      }

      const [pathUsername = ''] = url.pathname.split('/').filter(Boolean)
      const username = pathUsername.replace(/^@/, '')
      return username ? config.profileUrl(username) : ''
    } catch {
      return ''
    }
  }

  const username = trimmed
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .trim()

  return username ? config.profileUrl(username) : ''
}

function formatApplicationSubmittedAt(value) {
  if (!value) {
    return 'Submission time unavailable'
  }

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    return 'Submission time unavailable'
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

export { buildSocialProfileUrl, formatApplicationSubmittedAt }
