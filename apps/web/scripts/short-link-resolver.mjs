import { isIP } from 'node:net'

export const SHORT_LINK_ROUTE_PREFIX = '/r/'
export const SHORT_LINK_ORIGIN = 'https://placeholder-online.com'
export const SHORT_LINK_REDIRECT_STATUS = 302
export const SHORT_LINK_CACHE_CONTROL = 'private, no-store, max-age=0'

const SLUG = /^[A-Za-z0-9_-]{4,32}$/
const RESERVED_SLUGS = new Set(['admin', 'api00', 'health', 'login', 'logout', 'static', 'support'])
const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal'])

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || parts[0] === 0
}

function isUnsafeHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  if (BLOCKED_HOSTS.has(normalized) || normalized.endsWith('.localhost') || normalized.endsWith('.local') || normalized.endsWith('.internal')) return true
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized)
  if (isIP(normalized) === 6) {
    const compact = normalized.replace(/^\[|\]$/g, '')
    return compact === '::1' || compact === '::' || compact.startsWith('fc') || compact.startsWith('fd') || compact.startsWith('fe8') || compact.startsWith('fe9') || compact.startsWith('fea') || compact.startsWith('feb')
  }
  return !normalized.includes('.')
}

export function normalizeSafeDestination(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('unsafe_destination')
  let parsed
  try { parsed = new URL(value) } catch { throw new Error('invalid_destination') }
  if (parsed.protocol !== 'https:') throw new Error('unsafe_destination')
  if (parsed.username || parsed.password || parsed.port) throw new Error('unsafe_destination')
  if (isUnsafeHostname(parsed.hostname)) throw new Error('unsafe_destination')
  parsed.hash = ''
  return parsed.toString()
}

export function validateShortSlug(value) {
  return typeof value === 'string' && SLUG.test(value) && !RESERVED_SLUGS.has(value.toLowerCase())
}

export function createShortLinkStore({ now = () => Date.now() } = {}) {
  const records = new Map()
  const reserve = ({ slug, destination, projectId, expiresAt }) => {
    if (!validateShortSlug(slug)) throw new Error('invalid_slug')
    if (typeof projectId !== 'string' || !projectId) throw new Error('invalid_project')
    const expiry = Number(expiresAt)
    if (!Number.isFinite(expiry) || expiry <= now()) throw new Error('invalid_expiry')
    const normalizedDestination = normalizeSafeDestination(destination)
    const existing = records.get(slug)
    if (existing && existing.state !== 'expired') throw new Error('slug_unavailable')
    if ([...records.values()].some((record) => record.projectId === projectId && record.state === 'committed')) throw new Error('project_already_committed')
    const route = `${SHORT_LINK_ROUTE_PREFIX}${slug}`
    const record = { slug, route, payload: `${SHORT_LINK_ORIGIN}${route}`, destination: normalizedDestination, projectId, state: 'reserved', expiresAt: expiry }
    records.set(slug, record)
    return { ...record }
  }
  return {
    reserve,
    reserveMany({ slugs, destination, projectId, expiresAt }) {
      if (!Array.isArray(slugs) || slugs.length < 2 || new Set(slugs).size !== slugs.length) throw new Error('invalid_slug_set')
      const reserved = []
      try {
        for (const slug of slugs) reserved.push(reserve({ slug, destination, projectId, expiresAt }))
      } catch (error) {
        for (const record of reserved) records.delete(record.slug)
        throw error
      }
      return reserved
    },
    commit({ projectId, slug }) {
      const chosen = records.get(slug)
      if (!chosen || chosen.projectId !== projectId || chosen.state !== 'reserved' || chosen.expiresAt <= now()) throw new Error('reservation_unavailable')
      if ([...records.values()].some((record) => record.projectId === projectId && record.state === 'committed')) throw new Error('project_already_committed')
      for (const record of records.values()) {
        if (record.projectId === projectId && record.state === 'reserved') record.state = record.slug === slug ? 'committed' : 'expired'
      }
      return { ...records.get(slug) }
    },
    expireUncommitted({ projectId }) {
      let expired = 0
      for (const record of records.values()) {
        if (record.projectId === projectId && record.state === 'reserved') {
          record.state = 'expired'
          expired += 1
        }
      }
      return expired
    },
    get(slug) {
      const record = records.get(slug)
      if (record?.state === 'reserved' && record.expiresAt <= now()) record.state = 'expired'
      return record ? { ...record } : undefined
    },
  }
}

export function createCommittedShortLinkStore(records = []) {
  const committed = new Map()
  for (const record of records) {
    if (!validateShortSlug(record.slug)) throw new Error('invalid_slug')
    if (!['reserved', 'committed', 'expired', 'disabled'].includes(record.state)) throw new Error('invalid_short_link_state')
    committed.set(record.slug, {
      slug: record.slug,
      destination: normalizeSafeDestination(record.destination),
      projectId: record.projectId,
      state: record.state,
    })
  }
  return { get: (slug) => committed.get(slug) }
}

function sendText(response, status, body) {
  response.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': SHORT_LINK_CACHE_CONTROL,
    pragma: 'no-cache',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow',
  })
  response.end(body)
}

export function resolveShortLinkRequest(request, response, pathname, store) {
  if (!pathname.startsWith(SHORT_LINK_ROUTE_PREFIX)) return false
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD', 'cache-control': SHORT_LINK_CACHE_CONTROL }).end()
    return true
  }
  const slug = pathname.slice(SHORT_LINK_ROUTE_PREFIX.length)
  if (!validateShortSlug(slug)) {
    sendText(response, 404, 'Short link not found.')
    return true
  }
  const record = store.get(slug)
  if (!record) {
    sendText(response, 404, 'Short link not found.')
    return true
  }
  if (record.state !== 'committed') {
    sendText(response, 410, 'Short link unavailable.')
    return true
  }
  let destination
  try { destination = normalizeSafeDestination(record.destination) } catch {
    sendText(response, 410, 'Short link unavailable.')
    return true
  }
  response.writeHead(SHORT_LINK_REDIRECT_STATUS, {
    location: destination,
    'cache-control': SHORT_LINK_CACHE_CONTROL,
    pragma: 'no-cache',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow',
  })
  response.end()
  return true
}
