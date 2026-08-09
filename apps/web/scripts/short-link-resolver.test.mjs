import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'
import {
  createCommittedShortLinkStore,
  createShortLinkStore,
  normalizeSafeDestination,
  resolveShortLinkRequest,
} from './short-link-resolver.mjs'

async function unusedPort() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  await new Promise((resolve) => server.close(resolve))
  return port
}

function fakeResponse() {
  return {
    status: 0, headers: {}, body: '',
    writeHead(status, headers = {}) { this.status = status; this.headers = headers; return this },
    end(body = '') { this.body = body },
  }
}

test('reserves many candidates, commits one, and expires the unused candidates', () => {
  let now = 1_000
  const store = createShortLinkStore({ now: () => now })
  store.reserve({ slug: '7k9mqp', destination: 'https://example.com/final', projectId: 'project-1', expiresAt: 5_000 })
  store.reserve({ slug: '8n4wxy', destination: 'https://example.com/final', projectId: 'project-1', expiresAt: 5_000 })
  const committed = store.commit({ projectId: 'project-1', slug: '8n4wxy' })
  assert.equal(committed.state, 'committed')
  assert.equal(store.get('7k9mqp').state, 'expired')
  assert.throws(() => store.reserve({ slug: 'admin', destination: 'https://example.com', projectId: 'project-1', expiresAt: 5_000 }), /invalid_slug/)
  now = 6_000
})

test('blocks unsafe destinations and fails closed if a stored target becomes unsafe', () => {
  for (const value of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://localhost/path', 'https://127.0.0.1/path', 'https://10.0.0.1/path', 'https://service.internal/path']) {
    assert.throws(() => normalizeSafeDestination(value), /unsafe_destination/)
  }
  const response = fakeResponse()
  const handled = resolveShortLinkRequest({ method: 'GET' }, response, '/r/7k9mqp', { get: () => ({ state: 'committed', destination: 'https://127.0.0.1/private' }) })
  assert.equal(handled, true)
  assert.equal(response.status, 410)
  assert.equal(response.headers.location, undefined)
})

test('production runtime redirects one committed slug and fails safely for unknown/disabled slugs', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'qr-short-link-spike-'))
  await writeFile(join(root, 'index.html'), '<!doctype html><title>studio</title>')
  const port = await unusedPort()
  const records = [
    { slug: '7k9mqp', destination: 'https://example.com/final?source=qr', projectId: 'project-1', state: 'committed' },
    { slug: '8n4wxy', destination: 'https://example.com/disabled', projectId: 'project-2', state: 'disabled' },
  ]
  const child = spawn(process.execPath, [new URL('./production-server.mjs', import.meta.url).pathname], {
    env: { ...process.env, WEB_HOST: '127.0.0.1', WEB_PORT: String(port), WEB_STATIC_ROOT: root, SHORT_LINK_RECORDS_JSON: JSON.stringify(records) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  t.after(() => child.kill('SIGTERM'))
  let startup = ''
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { startup += chunk })
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => { startup += chunk })
  const deadline = Date.now() + 5_000
  while (!startup.includes('Studio production runtime listening') && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25))
  assert.match(startup, /Studio production runtime listening/)

  const committed = await fetch(`http://127.0.0.1:${port}/r/7k9mqp`, { redirect: 'manual' })
  assert.equal(committed.status, 302)
  assert.equal(committed.headers.get('location'), 'https://example.com/final?source=qr')
  assert.equal(committed.headers.get('cache-control'), 'private, no-store, max-age=0')

  const unknown = await fetch(`http://127.0.0.1:${port}/r/9zzzzz`, { redirect: 'manual' })
  assert.equal(unknown.status, 404)
  assert.equal(unknown.headers.get('location'), null)

  const disabled = await fetch(`http://127.0.0.1:${port}/r/8n4wxy`, { redirect: 'manual' })
  assert.equal(disabled.status, 410)
  assert.equal(disabled.headers.get('location'), null)
})

test('committed-record loading rejects unsafe targets before the runtime starts', () => {
  assert.throws(() => createCommittedShortLinkStore([{ slug: '7k9mqp', destination: 'https://169.254.169.254/latest', projectId: 'project-1' }]), /unsafe_destination/)
})
