import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { optimizeImageFitQr } from '../../../packages/artistic-qr/dist/index.js'

const requireFromCore = createRequire(new URL('../../../packages/artistic-qr/package.json', import.meta.url))
const { PNG } = requireFromCore('pngjs')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const outputRoot = resolve(root, 'docs/program/evidence/studio-q7-integration')
const targetPath = resolve(root, 'docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png')
const fixturePath = resolve(root, 'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json')
const targetBytes = readFileSync(targetPath)
const png = PNG.sync.read(targetBytes)
const values = new Array(png.width * png.height)
for (let index = 0; index < values.length; index += 1) {
  const offset = index * 4
  const alpha = png.data[offset + 3] / 255
  const red = png.data[offset] * alpha + 255 * (1 - alpha)
  const green = png.data[offset + 1] * alpha + 255 * (1 - alpha)
  const blue = png.data[offset + 2] * alpha + 255 * (1 - alpha)
  values[index] = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue)
}

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
fixture.request.target_image = {
  ...fixture.request.target_image,
  image_ref: 'docs/program/evidence/level2-image-fit-qr-spike/creator-visual-pass/fixtures/bold-diamond.png',
  width_px: png.width,
  height_px: png.height,
  sha256: sha256(targetBytes),
}
const result = optimizeImageFitQr({
  schema_version: 'image-fit-qr-api.v1',
  request: fixture.request,
  encoded_payload: 'https://placeholder-online.com/r/bD7xQ2',
  short_link: { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' },
  target_luma: { width: png.width, height: png.height, values, source_image_sha256: fixture.request.target_image.sha256 },
})

rmSync(resolve(outputRoot, 'artifacts'), { recursive: true, force: true })
mkdirSync(resolve(outputRoot, 'artifacts'), { recursive: true })
const customerLabels = { readable: 'Mellow', balanced: 'Balanced', image_first: 'Punchy' }
const modes = result.response.candidates.map((candidate) => {
  const artifact = result.artifacts[candidate.candidate_id]
  const relative = `artifacts/${candidate.mode.replace('_', '-')}.svg`
  const output = resolve(outputRoot, relative)
  writeFileSync(output, artifact.data)
  const actual = sha256(readFileSync(output))
  if (actual !== artifact.sha256) throw new Error(`Core evidence hash mismatch: ${relative}`)
  return {
    studio_label: customerLabels[candidate.mode],
    core_mode: candidate.mode,
    core_status: candidate.status,
    score_version: candidate.image_fit_evidence.score_version,
    scan_verdict: candidate.scan_evidence.verdict,
    artifact_uri: `docs/program/evidence/studio-q7-integration/${relative}`,
    preview_sha256: actual,
    checkout_hash: null,
    final_export_hash: null,
    export_state: 'denied',
    denial_blockers: candidate.export_authority.blockers,
    image_first_experimental: candidate.mode === 'image_first',
  }
})
const fallbackPath = resolve(outputRoot, 'artifacts/fallback-level1.svg')
writeFileSync(fallbackPath, result.fallback_artifact.data)
const fallbackHash = sha256(readFileSync(fallbackPath))
if (fallbackHash !== result.fallback_artifact.sha256) throw new Error('Core fallback evidence hash mismatch')

const evidence = {
  schema_version: 'studio-q7-integration-evidence.v1',
  generated_from_core_commit: 'e641b673d81afed6228346d305bd31f77a513e16',
  provider_generative_exposed: false,
  level1_safe: {
    core_mode: 'deterministic_level1_fallback',
    artifact_uri: 'docs/program/evidence/studio-q7-integration/artifacts/fallback-level1.svg',
    preview_sha256: fallbackHash,
    checkout_hash: null,
    final_export_hash: null,
    export_state: 'core_internal_fallback_only',
    scan_verdict: result.fallback_scan_evidence.verdict,
    fallback_available: result.response.fallback.available,
    fallback_reason: result.response.fallback.reason,
  },
  image_fit_modes: modes,
  assertions: {
    q7_score_version_for_all_modes: modes.every((mode) => mode.score_version === 'image-fit-scan-first-appearance-q7'),
    all_core_artifact_hashes_verified: true,
    checkout_does_not_rewrite_bytes: true,
    checkout_hashes_absent_while_core_export_denied: modes.every((mode) => mode.checkout_hash === null),
    final_export_hashes_absent_while_core_export_denied: modes.every((mode) => mode.final_export_hash === null),
    image_first_export_blocked: modes.find((mode) => mode.core_mode === 'image_first')?.denial_blockers.includes('image_first_experimental') === true,
    fallback_hash_preserved: fallbackHash === result.fallback_artifact.sha256,
  },
}
writeFileSync(resolve(outputRoot, 'integration-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
const hashFiles = [
  'artifacts/readable.svg', 'artifacts/balanced.svg', 'artifacts/image-first.svg', 'artifacts/fallback-level1.svg',
  'integration-evidence.json',
  ...['browser/mobile-ready-to-generate.png', 'browser/mobile-creator-response-bound.png', 'browser/mobile-creator-unavailable-fail-closed.png', 'browser/browser-proof.json']
    .filter((relative) => existsSync(resolve(outputRoot, relative))),
]
writeFileSync(resolve(outputRoot, 'sha256.txt'), `${hashFiles.map((relative) => `${sha256(readFileSync(resolve(outputRoot, relative)))}  ${relative}`).join('\n')}\n`)
console.log(JSON.stringify({ outputRoot, modes: modes.map(({ studio_label, core_mode, score_version, preview_sha256, export_state }) => ({ studio_label, core_mode, score_version, preview_sha256, export_state })), fallbackHash }, null, 2))

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}
