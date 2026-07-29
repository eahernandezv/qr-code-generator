import { resolve } from 'node:path'
import { CommerceService } from './service.js'
import { MockCheckoutProvider } from './provider.js'
import { JsonFileCommerceRepository } from './repository.js'
import { createCommerceHttpServer } from './httpServer.js'
const provider = new MockCheckoutProvider(process.env.COMMERCE_TEST_WEBHOOK_SECRET ?? 'local-test-webhook-secret-not-production')
const repository = new JsonFileCommerceRepository(resolve(process.env.COMMERCE_STATE_PATH ?? '.work-loop/evidence/stage2-remediation-cycle1/commerce-state.json'))
const app = createCommerceHttpServer(new CommerceService(provider,{repository}),provider,{port:Number(process.env.COMMERCE_PORT??4174),allowTestControls:process.env.COMMERCE_ALLOW_TEST_CONTROLS==='true'})
await app.listen(); console.log(`commerce-http-ready:${process.env.COMMERCE_PORT??4174}`)
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal,()=>void app.close().finally(()=>process.exit(0)))
