import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { resolve } from 'node:path'

const serviceEntry = resolve(process.cwd(), '../../packages/artistic-qr/dist/http-service-main.js')
const controlPort = Number(process.env.ARTISTIC_QR_SUPERVISOR_CONTROL_PORT ?? '8788')
let child
let stopping = false
let restartChain = Promise.resolve()

startChild()

const controlServer = createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/restart') {
    restartChain = restartChain.then(restartChild)
    await restartChain
    response.writeHead(204).end()
    return
  }
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true }))
    return
  }
  response.writeHead(404).end()
})
controlServer.listen(controlPort, '127.0.0.1')

process.on('SIGHUP', () => {
  restartChain = restartChain.then(restartChild).catch((error) => {
    process.stderr.write(`Core restart failed: ${error instanceof Error ? error.stack : error}\n`)
    process.exitCode = 1
  })
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => void shutdown(signal))
}

function startChild() {
  child = spawn(process.execPath, [serviceEntry], {
    env: process.env,
    stdio: 'inherit',
  })
  child.once('exit', (code, signal) => {
    if (!stopping && code !== 0 && signal !== 'SIGTERM') {
      process.stderr.write(`Artistic QR Core exited unexpectedly (${code ?? signal})\n`)
    }
  })
}

async function restartChild() {
  if (stopping) return
  if (child && child.exitCode === null) {
    child.kill('SIGTERM')
    await new Promise((resolveExit) => child.once('exit', resolveExit))
  }
  startChild()
}

async function shutdown(signal) {
  if (stopping) return
  stopping = true
  await restartChain
  if (child && child.exitCode === null) {
    child.kill(signal)
    await new Promise((resolveExit) => child.once('exit', resolveExit))
  }
  await new Promise((resolveClose) => controlServer.close(resolveClose))
  process.exit(0)
}
