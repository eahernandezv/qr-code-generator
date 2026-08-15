#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { normalizePayload, generateMatrix } from '../../qr-core/dist/index.js';
import { runValidation } from '../dist/validation.js';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const EVIDENCE = resolve(ROOT, 'docs/program/evidence/level2-provider-generative-q4');
const ARTIFACTS = resolve(EVIDENCE, 'local-artifacts');
const REPAIRED = resolve(EVIDENCE, 'repaired-artifacts');
mkdirSync(REPAIRED, { recursive: true });
const live = JSON.parse(readFileSync(resolve(EVIDENCE, 'live-provider-evidence.json'), 'utf8'));
const normalized = normalizePayload({ mode: 'url', content: live.payload, errorCorrectionLevel: 'H' });
const matrix = generateMatrix(normalized);
const strengths = [0.45, 0.6, 0.75];
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const evidence = [];

for (const item of live.results.filter((entry) => entry.status === 'succeeded')) {
  const sourceBytes = readFileSync(resolve(EVIDENCE, item.artifact));
  const source = PNG.sync.read(sourceBytes);
  const trials = [];
  for (const strength of strengths) {
    const repaired = composite(source, matrix, strength);
    const bytes = PNG.sync.write(repaired);
    const candidate = {
      candidateId: randomUUID(), matrixRef: `q4-composite:${matrix.version}:${matrix.maskPattern}`,
      rendered: { format: 'png-dataurl', data: `data:image/png;base64,${bytes.toString('base64')}`, width: repaired.width, height: repaired.height },
      scanResults: [], exportAllowed: false, artisticScore: 0.5,
    };
    const scan = runValidation(candidate, live.payload);
    const name = `${item.target}--composite-${String(strength).replace('.','p')}.png`;
    writeFileSync(resolve(REPAIRED, name), bytes);
    trials.push({ strength, artifact: `repaired-artifacts/${name}`, sha256: sha256(bytes), scan });
  }
  const passing = trials.filter((trial) => trial.scan.pass).sort((a,b)=>a.strength-b.strength)[0] ?? null;
  evidence.push({ target: item.target, source_artifact: item.artifact, trials, selected: passing?.artifact ?? null, selected_strength: passing?.strength ?? null });
  console.log(`${item.target}: ${passing ? `pass @ ${passing.strength}` : 'no passing repair'}`);
}
writeFileSync(resolve(EVIDENCE, 'repair-evidence.json'), JSON.stringify({
  policy: 'provider-art-composite-repair-spike-v1',
  description: 'Exact QR matrix composited over provider PNG; functional regions use full contrast and data modules use bounded opacity. Evidence-only until visual gate and Product Architect review.',
  matrix: { version: matrix.version, mask: matrix.maskPattern, size: matrix.size, quiet_zone_modules: 4 },
  evidence,
}, null, 2)+'\n');
console.log(JSON.stringify({ targets:evidence.length, repaired:evidence.filter(x=>x.selected).length },null,2));

function composite(source, matrix, opacity) {
  const out = new PNG({ width: source.width, height: source.height });
  out.data.set(source.data);
  const total = matrix.size + 8;
  const cell = Math.floor(Math.min(out.width,out.height)/total);
  const qrSize = cell*total;
  const ox = Math.floor((out.width-qrSize)/2), oy=Math.floor((out.height-qrSize)/2);
  const quiet = 4 * cell;
  // Enforce only the four quiet-zone strips. Preserve provider art behind the active matrix.
  fillRect(out, ox, oy, qrSize, quiet, [255,255,255], 1);
  fillRect(out, ox, oy + qrSize - quiet, qrSize, quiet, [255,255,255], 1);
  fillRect(out, ox, oy + quiet, quiet, qrSize - quiet * 2, [255,255,255], 1);
  fillRect(out, ox + qrSize - quiet, oy + quiet, quiet, qrSize - quiet * 2, [255,255,255], 1);
  for(let y=0;y<matrix.size;y++) for(let x=0;x<matrix.size;x++) {
    const dark=Boolean(matrix.modules[y][x]);
    const functional=isFunctional(matrix.functionalRegions,x,y);
    const alpha=functional?1:opacity;
    fillRect(out,ox+(x+4)*cell,oy+(y+4)*cell,cell,cell,dark?[0,0,0]:[255,255,255],alpha);
  }
  return out;
}
function isFunctional(r,x,y) {
  const rect=(a)=>a.some(p=>x>=p.x&&x<p.x+p.size&&y>=p.y&&y<p.y+p.size);
  if(rect(r.finderPatterns)||rect(r.separators)||rect(r.alignmentPatterns)) return true;
  if(r.timingPatterns.some(p=>x===p.x&&y===p.y)||r.formatInfo.some(p=>x===p.x&&y===p.y)) return true;
  if(r.versionInfo.some(p=>x===p.x&&y===p.y)) return true;
  return x===r.darkModule.x&&y===r.darkModule.y;
}
function fillRect(png,x,y,w,h,rgb,alpha){for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++){const i=(py*png.width+px)*4;for(let c=0;c<3;c++)png.data[i+c]=Math.round(png.data[i+c]*(1-alpha)+rgb[c]*alpha);png.data[i+3]=255;}}
