import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const assets = join(process.cwd(), 'dist', 'assets')
const javascript = readdirSync(assets)
  .filter((name) => name.endsWith('.js'))
  .map((name) => readFileSync(join(assets, name), 'utf8'))
  .join('\n')
const forbidden = ['Complete test payment', 'Simulate failure', 'grantPaidAccess', '__QR_COMMERCE_TEST__']
for (const marker of forbidden) {
  if (javascript.includes(marker)) throw new Error(`Production bundle contains forbidden mock commerce marker: ${marker}`)
}
if (!javascript.includes('/api/commerce')) throw new Error('Production bundle does not contain the HTTP commerce boundary')
console.log(`production-commerce-bundle-safe files=${readdirSync(assets).filter((name) => name.endsWith('.js')).length}`)
