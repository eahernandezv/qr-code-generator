import { createReadStream, promises as fs } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const host = process.env.WEB_HOST ?? '127.0.0.1'
const port = parsePort(process.env.WEB_PORT ?? '4175', 'WEB_PORT')
const staticRoot = resolve(process.env.WEB_STATIC_ROOT ?? new URL('../dist', import.meta.url).pathname)
const coreUpstream = upstream(process.env.ARTISTIC_QR_UPSTREAM ?? 'http://127.0.0.1:8787')
const commerceUpstream = upstream(process.env.COMMERCE_UPSTREAM ?? 'http://127.0.0.1:4174/api/commerce')

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    if (url.pathname === '/api/artistic-qr' || url.pathname.startsWith('/api/artistic-qr/')) {
      await proxy(request, response, coreUpstream, url.pathname.slice('/api/artistic-qr'.length) || '/', url.search)
      return
    }
    if (url.pathname === '/api/commerce' || url.pathname.startsWith('/api/commerce/')) {
      await proxy(request, response, commerceUpstream, url.pathname.slice('/api/commerce'.length) || '/', url.search)
      return
    }
    await serveStatic(request, response, url.pathname)
  } catch (error) {
    if (!response.headersSent) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
    }
    response.end(error instanceof Error ? error.message : 'Internal server error')
  }
})

server.listen(port, host, () => {
  process.stdout.write(`Studio production runtime listening on http://${host}:${port}\n`)
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)))
}

async function proxy(request, response, base, suffix, search) {
  const destination = new URL(`${base.pathname.replace(/\/$/, '')}${suffix}${search}`, base)
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined && !['host', 'connection', 'content-length'].includes(name)) {
      headers.set(name, Array.isArray(value) ? value.join(', ') : value)
    }
  }
  headers.set('x-forwarded-host', request.headers.host ?? '')
  headers.set('x-forwarded-proto', 'http')

  let upstreamResponse
  try {
    upstreamResponse = await fetch(destination, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request,
      duplex: 'half',
      redirect: 'manual',
    })
  } catch {
    response.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(JSON.stringify({ code: 'service_unavailable', message: 'Required API service is unavailable.' }))
    return
  }

  const responseHeaders = {}
  for (const [name, value] of upstreamResponse.headers) {
    if (!['connection', 'content-encoding', 'transfer-encoding'].includes(name)) responseHeaders[name] = value
  }
  response.writeHead(upstreamResponse.status, responseHeaders)
  if (request.method === 'HEAD' || !upstreamResponse.body) {
    response.end()
    return
  }
  for await (const chunk of upstreamResponse.body) response.write(chunk)
  response.end()
}

async function serveStatic(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' }).end()
    return
  }
  let relativePath
  try {
    relativePath = decodeURIComponent(pathname).replace(/^\/+/, '')
  } catch {
    response.writeHead(400).end()
    return
  }
  let filePath = resolve(staticRoot, relativePath || 'index.html')
  if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  let stat = await fs.stat(filePath).catch(() => undefined)
  if (!stat?.isFile()) {
    filePath = resolve(staticRoot, 'index.html')
    stat = await fs.stat(filePath).catch(() => undefined)
  }
  if (!stat?.isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Built Studio was not found. Run the web build first.')
    return
  }
  response.writeHead(200, {
    'content-type': contentType(filePath),
    'content-length': stat.size,
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  })
  if (request.method === 'HEAD') response.end()
  else createReadStream(filePath).pipe(response)
}

function upstream(value) {
  const parsed = new URL(value)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Upstreams must use HTTP or HTTPS')
  return parsed
}

function parsePort(value, name) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error(`${name} must be an integer from 1 to 65535`)
  return parsed
}

function contentType(filePath) {
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.map': 'application/json; charset=utf-8',
  })[extname(filePath)] ?? 'application/octet-stream'
}
