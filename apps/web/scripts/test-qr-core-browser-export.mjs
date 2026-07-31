import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { build, createLogger } from 'vite'

const outputDir = new URL('../dist-qr-core-browser/', import.meta.url)
const warnings = []
const logger = createLogger('info', { prefix: 'qr-core-browser-proof' })
const originalWarn = logger.warn
logger.warn = (message, options) => {
  warnings.push(String(message))
  originalWarn(message, options)
}

await build({
  configFile: new URL('../vite.qr-core-browser.config.ts', import.meta.url).pathname,
  customLogger: logger,
})

const forbiddenWarning = warnings.find((warning) => /externalized for browser compatibility|pngjs|jsqr|\bBuffer\b|node:/i.test(warning))
if (forbiddenWarning) throw new Error(`Forbidden browser bundle warning: ${forbiddenWarning}`)

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1)
    const safePath = normalize(join(outputDir.pathname, relative))
    if (!safePath.startsWith(normalize(outputDir.pathname))) throw new Error('Invalid path')
    const file = (await stat(safePath)).isDirectory() ? join(safePath, 'index.html') : safePath
    response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream' })
    response.end(await readFile(file))
  } catch {
    response.writeHead(404).end('not found')
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('HTTP proof server did not bind')

const browserErrors = []
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelector('#result')?.textContent === 'ready')
  const browserProof = await page.evaluate(() => window.qrCoreProof)
  if (browserErrors.length) throw new Error(`Browser pageerror: ${browserErrors.join('; ')}`)

  const serverCore = await import('@qr/qr-core')
  const normalized = serverCore.normalizePayload({ mode: 'url', content: 'example.com/browser-boundary', errorCorrectionLevel: 'H' })
  const matrix = serverCore.generateMatrix(normalized)
  const artifact = serverCore.renderDeterministic(matrix, {
    format: 'svg', moduleSize: 7, margin: 5, shape: 'rounded', eyeShape: 'circle',
  })
  if (JSON.stringify(browserProof.normalized) !== JSON.stringify(normalized)) throw new Error('Browser normalization differs from server')
  if (JSON.stringify(browserProof.matrix) !== JSON.stringify(matrix)) throw new Error('Browser matrix differs from server')
  if (browserProof.artifact.data !== artifact.data) throw new Error('Browser SVG is not byte-identical to server SVG')

  console.log(JSON.stringify({
    browserImport: '@qr/qr-core/browser',
    viteWarnings: warnings.length,
    nodeExternalizationWarnings: 0,
    pageErrors: browserErrors.length,
    svgByteLength: Buffer.byteLength(artifact.data),
    svgByteIdentical: true,
  }))
} finally {
  await browser.close()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}