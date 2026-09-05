import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
const requireFromArtistic = createRequire(new URL('../../../packages/artistic-qr/package.json', import.meta.url))
const { PNG } = requireFromArtistic('pngjs')

const root = resolve(process.cwd(), '../..')
const dir = resolve(root, 'docs/program/evidence/readiness-live-proof')
const uploadDir = '/tmp/qr-image-fit-uploads'
const proof = JSON.parse(readFileSync(resolve(dir, 'proof.json'), 'utf8'))

function sha256(buf) { return createHash('sha256').update(buf).digest('hex') }
function readPng(path) { const bytes = readFileSync(path); return { path, sha256: sha256(bytes), image: PNG.sync.read(bytes), bytes } }
function preparedPath(result) { return resolve(uploadDir, `${result.readiness.preparedAsset.sha256}.png`) }
function generatedPaths(kind) { return ['small', 'medium', 'large'].map((size, i) => ({ size, path: resolve(dir, `${kind}-${i}-${size}.png`) })) }
const cells = []
for (const result of proof.results) {
  const kind = result.kind
  cells.push({ label: `${kind} source`, ...readPng(resolve(dir, `${kind}-source.png`)) })
  cells.push({ label: `${kind} prepared`, ...readPng(preparedPath(result)) })
  for (const generated of generatedPaths(kind)) {
    try { cells.push({ label: `${kind} ${generated.size}`, ...readPng(generated.path) }) } catch {}
  }
}
const cellW = 330, imgBox = 272, top = 48, gap = 22, cols = 4, rows = Math.ceil(cells.length / cols)
const sheet = new PNG({ width: cols * cellW, height: rows * (top + imgBox + gap), colorType: 6 })
for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i]=248; sheet.data[i+1]=250; sheet.data[i+2]=252; sheet.data[i+3]=255 }
function set(x,y,r,g,b,a=255){ if(x<0||y<0||x>=sheet.width||y>=sheet.height)return; const o=(y*sheet.width+x)*4; sheet.data[o]=r; sheet.data[o+1]=g; sheet.data[o+2]=b; sheet.data[o+3]=a }
function rect(x,y,w,h,r,g,b){ for(let yy=y; yy<y+h; yy++) for(let xx=x; xx<x+w; xx++) set(xx,yy,r,g,b) }
function blit(src, dx, dy, dw, dh) { for(let y=0;y<dh;y++) for(let x=0;x<dw;x++){ const sx=Math.floor(x*src.width/dw), sy=Math.floor(y*src.height/dh), so=(sy*src.width+sx)*4; set(dx+x, dy+y, src.data[so], src.data[so+1], src.data[so+2], src.data[so+3]) } }
function bits(ch) { return ch.charCodeAt(0).toString(2).padStart(8,'0') }
function text(label,x,y) { let cx=x; for (const ch of label.toUpperCase().slice(0,18)) { const b=bits(ch); for (let bit=0; bit<8; bit++) if (b[bit] === '1') rect(cx+bit*3,y,2,12,15,23,42); cx += 28 } }
for (let i=0;i<cells.length;i++) {
  const col = i % cols, row = Math.floor(i / cols)
  const x = col * cellW, y = row * (top + imgBox + gap)
  rect(x + 12, y + 12, cellW - 24, top + imgBox - 4, 255,255,255)
  text(cells[i].label, x + 24, y + 22)
  const img = cells[i].image
  const scale = Math.min(imgBox / img.width, imgBox / img.height)
  const dw = Math.round(img.width * scale), dh = Math.round(img.height * scale)
  blit(img, x + Math.floor((cellW - dw)/2), y + top + Math.floor((imgBox - dh)/2), dw, dh)
}
const out = resolve(dir, 'fox-wolf-source-prepared-output-review.png')
writeFileSync(out, PNG.sync.write(sheet))
writeFileSync(resolve(dir, 'quality-review-inputs.json'), JSON.stringify({ createdAt: new Date().toISOString(), cells: cells.map(({label,path,sha256,image}) => ({ label, path, sha256, width: image.width, height: image.height })) }, null, 2))
console.log(out)
