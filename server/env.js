import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function loadLocalEnv(filePath = join(process.cwd(), '.env')) {
  if (!existsSync(filePath)) {
    return
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = stripQuotes(trimmed.slice(separatorIndex + 1).trim())

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

export { loadLocalEnv }
