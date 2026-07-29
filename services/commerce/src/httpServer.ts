import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { CommerceService } from './service.js'
import { MockCheckoutProvider } from './provider.js'
import { CommerceError } from './types.js'
import type { PaymentEventType } from './types.js'

export interface CommerceHttpServerOptions { host?: string; port?: number; allowTestControls?: boolean }
export function createCommerceHttpServer(service: CommerceService, provider: MockCheckoutProvider, options: CommerceHttpServerOptions = {}) {
  const host = options.host ?? '127.0.0.1'; const port = options.port ?? 4174
  const server = createServer(async (request, response) => {
    setCors(response)
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return }
    try { await route(request, response, service, provider, Boolean(options.allowTestControls)) }
    catch (error) { sendError(response, error) }
  })
  return { server, listen: () => new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => resolve()) }), close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) }
}

async function route(request: IncomingMessage, response: ServerResponse, service: CommerceService, provider: MockCheckoutProvider, allowTestControls: boolean) {
  const url = new URL(request.url ?? '/', 'http://localhost'); const token = bearer(request)
  if (request.method === 'GET' && url.pathname === '/api/commerce/health') return send(response, 200, { ok: true })
  if (request.method === 'POST' && url.pathname === '/api/commerce/checkouts') {
    const body = await bodyJson(request) as { offerId?: 'artistic_project'|'extra_exploration'; idempotencyKey?: string }
    if (!body.offerId || !body.idempotencyKey) throw new CommerceError('bad_request', 'Checkout input is incomplete.')
    const result = await service.startCheckout({ offerId: body.offerId, idempotencyKey: body.idempotencyKey, projectAccessToken: token })
    return send(response, 201, { checkoutSessionId: result.session.checkoutSessionId, offerId: result.session.offerId, amountCents: result.session.amountCents, status: result.session.status, redirectUrl: result.redirectUrl, projectAccessToken: result.projectAccessToken, recoveryCode: result.recoveryCode })
  }
  const checkoutMatch = url.pathname.match(/^\/api\/commerce\/checkouts\/([^/]+)$/)
  if (request.method === 'GET' && checkoutMatch) {
    const session = service.checkoutStatus(decodeURIComponent(checkoutMatch[1])); let entitlement
    if (token) { try { entitlement = service.entitlementForAccess(token) } catch { entitlement = undefined } }
    return send(response, 200, { checkoutSessionId: session.checkoutSessionId, offerId: session.offerId, amountCents: session.amountCents, status: session.status, entitlement })
  }
  if (request.method === 'POST' && url.pathname === '/api/commerce/generations') {
    if (!token) throw new CommerceError('payment_unverified', 'Verified project access is required.')
    return send(response, 200, service.recordGeneration(token, await bodyJson(request) as never))
  }
  if (request.method === 'POST' && url.pathname === '/api/commerce/exports') {
    if (!token) throw new CommerceError('payment_unverified', 'Verified project access is required.')
    return send(response, 200, service.authorizeExport(token, await bodyJson(request) as never))
  }
  if (request.method === 'POST' && url.pathname === '/api/commerce/recovery') {
    const body = await bodyJson(request) as { recoveryCode?: string }; if (!body.recoveryCode) throw new CommerceError('bad_request', 'Recovery code is required.')
    return send(response, 200, service.recover(body.recoveryCode))
  }
  const testEvent = url.pathname.match(/^\/__test__\/commerce\/checkouts\/([^/]+)\/events$/)
  if (request.method === 'POST' && testEvent && allowTestControls) {
    const body = await bodyJson(request) as { type?: PaymentEventType; providerEventId?: string }
    if (!body.type) throw new CommerceError('bad_request', 'Event type is required.')
    const event = { providerEventId: body.providerEventId ?? `test_${randomUUID()}`, checkoutSessionId: decodeURIComponent(testEvent[1]), type: body.type, occurredAt: new Date().toISOString() }
    const raw = JSON.stringify(event); return send(response, 200, service.processPaymentWebhook(raw, provider.signWebhook(raw)))
  }
  if (request.method === 'POST' && url.pathname === '/__test__/commerce/fail-provider' && allowTestControls) { provider.failNext = true; return send(response, 204, undefined) }
  send(response, 404, { code: 'not_found', message: 'Route not found.' })
}
function bearer(request: IncomingMessage): string | undefined { const value=request.headers.authorization; return value?.startsWith('Bearer ') ? value.slice(7) : undefined }
async function bodyJson(request: IncomingMessage): Promise<unknown> { const chunks: Buffer[]=[]; let size=0; for await (const chunk of request) { const part=Buffer.from(chunk); size+=part.length; if(size>64_000) throw new CommerceError('bad_request','Request is too large.'); chunks.push(part) } try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { throw new CommerceError('bad_request','Request body is invalid JSON.') } }
function setCors(response: ServerResponse) { response.setHeader('Access-Control-Allow-Origin','*'); response.setHeader('Access-Control-Allow-Headers','authorization,content-type'); response.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS'); response.setHeader('Cache-Control','no-store') }
function send(response: ServerResponse,status:number,value:unknown) { if(status===204){response.writeHead(status).end();return} response.setHeader('Content-Type','application/json'); response.writeHead(status).end(JSON.stringify(value)) }
function sendError(response: ServerResponse,error:unknown) { const known=error as {code?:string;message?:string}; const code=known.code ?? 'service_unavailable'; const status=code==='checkout_session_not_found'?404:code==='payment_provider_error'?503:code==='payment_unverified'||code.startsWith('project_access_')?403:400; send(response,status,{code,message:known.message??'Commerce service is unavailable.'}) }
