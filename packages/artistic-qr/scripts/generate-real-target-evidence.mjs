#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/image-fit.js';
import { rasterizeCandidate } from '../dist/validation.js';

const ROOT = resolve(new URL('../../..', import.meta.url).pathname);
const EVIDENCE_DIR = resolve(ROOT, 'docs/program/evidence/level2-image-fit-real-targets-q3');
const INPUT_DIR = resolve(EVIDENCE_DIR, 'inputs');
const FIXTURE_PATH = resolve(ROOT, 'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json');
for (const dir of ['artifacts', 'contact-sheet', 'visual-preview']) mkdirSync(resolve(EVIDENCE_DIR, dir), { recursive: true });
const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));

const TARGET_META = {
  'letter-j-gradient.jpg': { name: 'letter-j-gradient', complexity: 'medium_logo' },
  'geometric-media-mark.jpg': { name: 'geometric-media-mark', complexity: 'high_risk_thin_detail' },
  'gradient-m-mark.jpg': { name: 'gradient-m-mark', complexity: 'medium_logo' },
  'red-wolf-front.jpg': { name: 'red-wolf-front', complexity: 'complex_photo_like' },
  'burger-brand-reference.jpg': { name: 'burger-brand-reference', complexity: 'high_risk_thin_detail' },
  'wolf-black-white.jpg': { name: 'wolf-black-white', complexity: 'complex_photo_like' },
  'wolf-profile-watermarked.jpg': { name: 'wolf-profile-watermarked', complexity: 'complex_photo_like' },
  'calligraphic-j-heart.jpg': { name: 'calligraphic-j-heart', complexity: 'high_risk_thin_detail' },
};
const MODES = ['readable', 'balanced', 'image_first'];

function sha256(data) { return createHash('sha256').update(data).digest('hex'); }

function loadJpegLuma(path) {
  const program = `
import json,sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB')
im.thumbnail((160,160), Image.Resampling.LANCZOS)
w,h=im.size
vals=[]
for r,g,b in im.getdata(): vals.append(round(0.2126*r+0.7152*g+0.0722*b))
print(json.dumps({'width':w,'height':h,'values':vals},separators=(',',':')))
`;
  return JSON.parse(execFileSync('python3', ['-c', program, path], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
}

function buildInput(target, fileBytes, meta) {
  const hash = sha256(fileBytes);
  return {
    schema_version: 'image-fit-qr-api.v1',
    request: {
      ...structuredClone(fixture.request),
      request_id: `q3-${meta.name}`,
      target_image: {
        image_ref: `user-provided://${meta.name}`,
        mime_type: 'image/jpeg', width_px: target.width, height_px: target.height,
        sha256: hash, complexity: meta.complexity,
      },
      constraints: { ...fixture.request.constraints, max_candidates: 3, max_search_ms: 15_000 },
    },
    encoded_payload: 'https://placeholder-online.com/r/bD7xQ2',
    short_link: { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' },
    target_luma: { ...target, source_image_sha256: hash },
  };
}

const stableValidation = (_candidate, payload) => ({
  pass: true, decoder: 'deterministic-evidence-only', version: '1', thresholdVersion: 'visual-ab-only-v1',
  scannedPayload: payload, overallConfidence: 'high',
  tests: [{ name: 'visual_ab_only', pass: true, scale: 1, perturbation: 'none' }],
});

function rasterizeAndSave(result, candidate, label) {
  const artifact = result.artifacts[candidate.candidate_id];
  writeFileSync(resolve(EVIDENCE_DIR, 'artifacts', `${label}.svg`), artifact.data);
  const raster = rasterizeCandidate({ candidateId: candidate.candidate_id,
    matrixRef: `qr:${candidate.qr_settings.version}:${candidate.qr_settings.mask}`,
    rendered: { format: 'svg', data: artifact.data, width: 1, height: 1 }, scanResults: [], exportAllowed: false, artisticScore: 0 });
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  const buf = PNG.sync.write(png);
  writeFileSync(resolve(EVIDENCE_DIR, 'visual-preview', `${label}.png`), buf);
  return { width: raster.width, height: raster.height, data: raster.data };
}

function writeThreePanel(path, target, q2, q3) {
  const gap = 12, headerH = 18, panel = Math.max(q2.width, q3.width);
  const out = new PNG({ width: panel * 3 + gap * 2, height: panel + headerH }); out.data.fill(255);
  const headers = [[110,110,110,255],[214,156,46,255],[45,126,190,255]];
  for (let p=0;p<3;p++) for(let y=0;y<headerH;y++) for(let x=0;x<panel;x++) out.data.set(headers[p],(y*out.width+p*(panel+gap)+x)*4);
  drawTarget(out,target,0,headerH,panel); drawRaster(out,q2,panel+gap,headerH); drawRaster(out,q3,(panel+gap)*2,headerH);
  writeFileSync(path, PNG.sync.write(out));
}
function drawTarget(out,target,dx,dy,size) {
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const sx=Math.min(target.width-1,Math.floor(x*target.width/size));
    const sy=Math.min(target.height-1,Math.floor(y*target.height/size));
    const v=target.values[sy*target.width+sx], i=((dy+y)*out.width+dx+x)*4; out.data.set([v,v,v,255],i);
  }
}
function drawRaster(out,r,dx,dy) {
  for(let y=0;y<r.height;y++) for(let x=0;x<r.width;x++) {
    const si=(y*r.width+x)*4, di=((dy+y)*out.width+dx+x)*4; out.data.set(r.data.subarray(si,si+4),di);
  }
}

const report = { reproducibility: 'deterministic from committed user-provided JPEG bytes', pipeline_version: 'image-fit-real-target-foreground-q3', rights: 'user-provided evaluation references; rights not independently verified; internal quality evaluation only', targets: [] };
const decoderReport = { threshold_version: 'scan-v1-real-75pct', candidates: [], fallback_proofs: [] };

for (const file of readdirSync(INPUT_DIR).filter((name) => name.endsWith('.jpg')).sort()) {
  const meta = TARGET_META[file]; if (!meta) continue;
  const path = resolve(INPUT_DIR, file), bytes = readFileSync(path), target = loadJpegLuma(path), input = buildInput(target, bytes, meta);
  const q2 = optimizeImageFitQr(input, { validationRunner: stableValidation, _compositionPolicy: 'q2' });
  const q3 = optimizeImageFitQr(input, { validationRunner: stableValidation, _compositionPolicy: 'q3' });
  const objective = optimizeImageFitQr(input, { _compositionPolicy: 'q3' });
  const targetReport = { target: meta.name, source_sha256: sha256(bytes), source_dimensions: [target.width,target.height], candidates: [] };
  for (const mode of MODES) {
    const before=q2.response.candidates.find(c=>c.mode===mode), after=q3.response.candidates.find(c=>c.mode===mode); if(!before||!after) continue;
    const label=`${meta.name}--${mode}`, q2png=rasterizeAndSave(q2,before,`q2--${label}`), q3png=rasterizeAndSave(q3,after,`q3--${label}`);
    writeThreePanel(resolve(EVIDENCE_DIR,'contact-sheet',`source-q2-q3--${label}.png`),target,q2png,q3png);
    targetReport.candidates.push({ mode, q2:{sha256:before.artifacts[0].sha256,modified_fraction:before.image_treatment.modified_fraction,recognition_score:before.image_fit_evidence.recognition_score}, q3:{sha256:after.artifacts[0].sha256,modified_fraction:after.image_treatment.modified_fraction,recognition_score:after.image_fit_evidence.recognition_score,protected_conflicts:after.image_fit_evidence.protected_zone_conflict_score} });
  }
  for (const candidate of objective.response.candidates) decoderReport.candidates.push({ target:meta.name,mode:candidate.mode,verdict:candidate.scan_evidence.verdict,checks:`${candidate.scan_evidence.checks_passed}/${candidate.scan_evidence.checks_total}`,decoder:candidate.scan_evidence.decoders[0]?.name,export_allowed:candidate.export_authority.export_allowed,blockers:candidate.export_authority.blockers,protected_violations:candidate.protected_regions.violations.length });
  decoderReport.fallback_proofs.push({target:meta.name,verdict:objective.fallback_scan_evidence.verdict,checks:`${objective.fallback_scan_evidence.checks_passed}/${objective.fallback_scan_evidence.checks_total}`});
  report.targets.push(targetReport);
}
writeFileSync(resolve(EVIDENCE_DIR,'quality-evidence.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(resolve(EVIDENCE_DIR,'decoder-pass-proof.json'),JSON.stringify(decoderReport,null,2)+'\n');
console.log(JSON.stringify({targets:report.targets.map(x=>x.target),decoderSummary:{total:decoderReport.candidates.length,passed:decoderReport.candidates.filter(x=>x.verdict==='pass').length,failed:decoderReport.candidates.filter(x=>x.verdict!=='pass').length}},null,2));
