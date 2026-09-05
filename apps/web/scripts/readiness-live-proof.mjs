import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
const requireFromArtistic = createRequire(new URL('../../../packages/artistic-qr/package.json', import.meta.url))
const { PNG } = requireFromArtistic('pngjs')

const base = process.env.STUDIO_URL ?? 'https://placeholder-online.com'
const apiPrefix = process.env.ARTISTIC_QR_API_PREFIX ?? (base.includes('127.0.0.1') || base.includes('localhost') ? '' : '/api/artistic-qr')
const outDir = resolve(process.cwd(), '../../docs/program/evidence/readiness-live-proof')
mkdirSync(outDir, { recursive: true })

function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex') }
function dataUrl(buffer) { return `data:image/png;base64,${buffer.toString('base64')}` }
function set(px, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= px.width || y >= px.height) return
  const o = (y * px.width + x) * 4
  px.data[o] = r; px.data[o + 1] = g; px.data[o + 2] = b; px.data[o + 3] = a
}
function ellipse(px, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) set(px, x, y, ...color)
  }
}
function triangle(px, points, color) {
  const [a,b,c]=points
  const minX=Math.floor(Math.min(a[0],b[0],c[0])), maxX=Math.ceil(Math.max(a[0],b[0],c[0]))
  const minY=Math.floor(Math.min(a[1],b[1],c[1])), maxY=Math.ceil(Math.max(a[1],b[1],c[1]))
  const area=(p1,p2,p3)=>(p1[0]*(p2[1]-p3[1])+p2[0]*(p3[1]-p1[1])+p3[0]*(p1[1]-p2[1]))/2
  const A=Math.abs(area(a,b,c))
  for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++){ const p=[x,y]; const A1=Math.abs(area(p,b,c)),A2=Math.abs(area(a,p,c)),A3=Math.abs(area(a,b,p)); if(Math.abs(A-(A1+A2+A3))<0.5) set(px,x,y,...color)}
}
function makeIcon(kind) {
  const png = new PNG({ width: 180, height: 132, colorType: 6 })
  for (let i=0;i<png.data.length;i+=4) { png.data[i]=250; png.data[i+1]=250; png.data[i+2]=247; png.data[i+3]=255 }
  if (kind === 'fox') {
    triangle(png, [[58,42],[72,10],[84,47]], [212, 92, 28])
    triangle(png, [[122,42],[108,10],[96,47]], [212, 92, 28])
    ellipse(png, 90, 69, 54, 46, [219, 96, 32])
    ellipse(png, 70, 82, 22, 19, [255, 247, 235])
    ellipse(png, 110, 82, 22, 19, [255, 247, 235])
    ellipse(png, 90, 86, 9, 6, [31, 41, 55])
    ellipse(png, 73, 62, 5, 7, [17, 24, 39])
    ellipse(png, 107, 62, 5, 7, [17, 24, 39])
  } else {
    triangle(png, [[58,45],[66,10],[82,48]], [86, 97, 115])
    triangle(png, [[122,45],[114,10],[98,48]], [86, 97, 115])
    ellipse(png, 90, 70, 55, 45, [107, 114, 128])
    ellipse(png, 90, 86, 28, 18, [226, 232, 240])
    ellipse(png, 90, 88, 9, 6, [15, 23, 42])
    ellipse(png, 73, 62, 5, 6, [17, 24, 39])
    ellipse(png, 107, 62, 5, 6, [17, 24, 39])
  }
  return PNG.sync.write(png)
}
async function post(path, json) {
  const res = await fetch(new URL(`${apiPrefix}${path}`, base), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) })
  const body = await res.json().catch(() => undefined)
  if (!res.ok) throw new Error(`${path} ${res.status} ${JSON.stringify(body)}`)
  return body
}
function targetFromAsset(asset, complexity) {
  return { image_ref: asset.uri, mime_type: asset.mimeType, width_px: asset.width, height_px: asset.height, sha256: asset.sha256, complexity }
}
async function prove(kind) {
  const source = makeIcon(kind)
  writeFileSync(resolve(outDir, `${kind}-source.png`), source)
  const upload = await post('/image-fit/uploads', { data_url: dataUrl(source) })
  const readiness = await post('/image-readiness/assess', { requestId: `live-${kind}-${Date.now()}`, sourceAsset: upload.source_asset, intendedUse: 'level2-image-fit', payloadPreview: `https://example.com/${kind}`, constraints: { preserveImageColors: true, preserveSubjectCentering: true, allowCrop: true, allowUpscale: true, maxPreparedDimension: 1024 } })
  const prepared = readiness.report.preparedAsset ? targetFromAsset(readiness.report.preparedAsset, upload.target_image.complexity) : upload.target_image
  const generation = await post('/image-fit/candidates', {
    request_id: `l2req-live-${kind}-${Date.now()}`,
    destination: { kind: 'url', normalized_url: `https://example.com/${kind}`, display_url: `https://example.com/${kind}`, safety: { verdict: 'pass', policy_version: 'live-proof' } },
    target_image: prepared,
    user_controls: { treatment: 'pixel_blend', strength: 'balanced', detail: 'detailed', link_mode: 'optimized_short_link' },
    constraints: { max_candidates: 12, max_search_ms: 45000, allowed_ecc: ['Q', 'H'], allowed_masks: [0,1,2,3,4,5,6,7], allowed_versions: [8,9,10,11,12] },
    entitlement_context: { mode: 'preview', export_entitled: false },
  })
  const candidates = generation.result.candidates.filter(c => c.status === 'validated' && c.scan_evidence.verdict === 'pass')
  for (const [i,c] of candidates.entries()) {
    const a = c.artifacts[0]
    if (a?.uri?.startsWith('data:image/png;base64,')) writeFileSync(resolve(outDir, `${kind}-${i}-${c.image_treatment.logo_size ?? c.mode}.png`), Buffer.from(a.uri.replace(/^data:image\/png;base64,/, ''), 'base64'))
  }
  return { kind, sourceSha256: sha256(source), upload, readiness: readiness.report, candidateCount: generation.result.candidates.length, validatedCount: candidates.length, candidateIds: candidates.map(c => c.candidate_id), artifactHashes: candidates.map(c => c.artifacts[0]?.sha256) }
}
const results = []
for (const kind of ['fox', 'wolf']) results.push(await prove(kind))
writeFileSync(resolve(outDir, 'proof.json'), JSON.stringify({ base, createdAt: new Date().toISOString(), results }, null, 2))
console.log(JSON.stringify({ outDir, results: results.map(r => ({ kind: r.kind, decision: r.readiness.decision, proofPass: r.readiness.proof.pass, candidateCount: r.candidateCount, validatedCount: r.validatedCount, candidateIds: r.candidateIds })) }, null, 2))
