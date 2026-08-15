#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/image-fit.js';
import { rasterizeCandidate, runValidation } from '../dist/validation.js';

const root = resolve(new URL('../../..', import.meta.url).pathname);
const referencePath = resolve(root, 'docs/program/handoffs/assets/q8-reference-logo.jpg');
const baselinePath = resolve(root, 'docs/program/evidence/q8-quality-loop/cycle-1-protected-island/artifacts/image-first.png');
const output = resolve(root, 'docs/program/evidence/q8-quality-loop/cycle-2-negative-space');
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, 'artifacts'), { recursive: true });

const referenceBytes = readFileSync(referencePath);
const referenceHash = createHash('sha256').update(referenceBytes).digest('hex');
if (referenceHash !== 'cb3b4fecbd0547cd2dfb62daeecfc0116e4dd49fb653ac602025a77b00badaec') throw new Error('Q8 reference hash mismatch');
const pythonDecode = `from PIL import Image\nimport json,sys\nim=Image.open(sys.argv[1]).convert('RGB')\nim.thumbnail((192,192),Image.Resampling.LANCZOS)\nrgb=[v for px in im.get_flattened_data() for v in px]\nluma=[round(.2126*rgb[i]+.7152*rgb[i+1]+.0722*rgb[i+2]) for i in range(0,len(rgb),3)]\nprint(json.dumps({'width':im.width,'height':im.height,'rgb':rgb,'luma':luma},separators=(',',':')))`;
const target = JSON.parse(execFileSync('/opt/qr-hermes/venv/bin/python3', ['-c', pythonDecode, referencePath], { encoding: 'utf8', maxBuffer: 20_000_000 }));
const requestFixture = JSON.parse(readFileSync(resolve(root, 'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'), 'utf8')).request;
requestFixture.target_image = { image_ref: 'docs/program/handoffs/assets/q8-reference-logo.jpg', mime_type: 'image/jpeg', width_px: target.width, height_px: target.height, sha256: referenceHash, complexity: 'medium_logo' };
requestFixture.constraints = { ...requestFixture.constraints, max_search_ms: 60000, max_candidates: 3 };
const payload = 'https://placeholder-online.com/r/bD7xQ2';
const input = {
  schema_version: 'image-fit-qr-api.v1', request: requestFixture, encoded_payload: payload,
  short_link: { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' },
  target_luma: { width: target.width, height: target.height, values: target.luma, source_image_sha256: referenceHash },
  target_rgb: { width: target.width, height: target.height, values: target.rgb, source_image_sha256: referenceHash },
};
const options = { _visualPolicy: 'q8_negative_space_island' };
const result = optimizeImageFitQr(input, options);
const repeat = optimizeImageFitQr(input, options);
function validationCandidate(candidate, artifact) {
  return { candidateId: candidate?.candidate_id ?? 'fallback', matrixRef: candidate ? `qr:${candidate.qr_settings.version}:${candidate.qr_settings.ecc}:${candidate.qr_settings.mask}` : 'fallback', rendered: { format: 'svg', data: artifact.data, width: 1, height: 1 }, scanResults: [], exportAllowed: false, artisticScore: 0 };
}
function save(label, artifact, candidate) {
  writeFileSync(resolve(output, 'artifacts', `${label}.svg`), artifact.data);
  const raster = rasterizeCandidate(validationCandidate(candidate, artifact));
  const png = new PNG({ width: raster.width, height: raster.height }); png.data = Buffer.from(raster.data);
  writeFileSync(resolve(output, 'artifacts', `${label}.png`), PNG.sync.write(png));
}
const candidates = result.response.candidates.map((candidate) => {
  const label = candidate.mode.replace('_', '-'), artifact = result.artifacts[candidate.candidate_id];
  save(label, artifact, candidate);
  const independent = runValidation(validationCandidate(candidate, artifact), payload);
  const repeated = repeat.response.candidates.find((entry) => entry.mode === candidate.mode);
  return {
    mode: candidate.mode, candidate_id: candidate.candidate_id, settings: candidate.qr_settings,
    scan: candidate.scan_evidence,
    independent_validation: {
      pass: independent.pass, scanned_payload: independent.scannedPayload,
      payload_equal: independent.scannedPayload === payload,
      raw_decode: independent.tests.find((test) => test.name === 'decode_raw')?.pass === true,
      checks_passed: independent.tests.filter((test) => test.pass).length, checks_total: independent.tests.length,
    },
    recognition_score: candidate.image_fit_evidence.recognition_score,
    protected_conflict_score: candidate.image_fit_evidence.protected_zone_conflict_score,
    protected_violations: candidate.protected_regions.violations,
    export_parity: 'not_claimed_export_locked', export_authority: candidate.export_authority,
    artifact: { kind: candidate.artifacts[0].kind, sha256: candidate.artifacts[0].sha256, path: `artifacts/${label}.svg` },
    deterministic: repeated?.candidate_id === candidate.candidate_id && repeated?.artifacts[0]?.sha256 === candidate.artifacts[0].sha256,
  };
});
save('fallback', result.fallback_artifact);
const fallbackIndependent = runValidation(validationCandidate(undefined, result.fallback_artifact), payload);
writeFileSync(resolve(output, 'objective-evidence.json'), JSON.stringify({
  schema_version: 'q8-cycle-2-objective.v1', baseline_commit: 'e150965c758ad8ba8b9b407a9e0fab5a100a11e9',
  visual_policy: 'q8_negative_space_island', reference: { sha256: referenceHash, width: target.width, height: target.height },
  payload_sha256: createHash('sha256').update(payload).digest('hex'), candidates,
  fallback: { scan: result.fallback_scan_evidence, independent_validation: { pass: fallbackIndependent.pass, scanned_payload: fallbackIndependent.scannedPayload, payload_equal: fallbackIndependent.scannedPayload === payload, raw_decode: fallbackIndependent.tests.find((test) => test.name === 'decode_raw')?.pass === true, checks_passed: fallbackIndependent.tests.filter((test) => test.pass).length, checks_total: fallbackIndependent.tests.length }, export_parity: 'not_claimed_export_locked', deterministic: repeat.fallback_artifact.sha256 === result.fallback_artifact.sha256, artifact_sha256: result.fallback_artifact.sha256 },
}, null, 2) + '\n');
const pythonSheet = `from PIL import Image,ImageDraw\nimport sys\nref,base,readable,balanced,image_first,fallback,out=sys.argv[1:]\nitems=[('REFERENCE',ref),('CYCLE 1 BEST / 92',base),('CYCLE 2 READABLE',readable),('CYCLE 2 BALANCED',balanced),('CYCLE 2 IMAGE-FIRST',image_first),('LEVEL 1 FALLBACK',fallback)]\nW,H=420,420\nsheet=Image.new('RGB',(W*3,H*2),(229,233,240)); d=ImageDraw.Draw(sheet)\nfor i,(label,path) in enumerate(items):\n im=Image.open(path).convert('RGB'); im.thumbnail((360,340),Image.Resampling.LANCZOS); x=(i%3)*W+(W-im.width)//2; y=(i//3)*H+58; sheet.paste(im,(x,y)); d.text(((i%3)*W+18,(i//3)*H+20),label,fill=(17,24,39),stroke_width=1)\nsheet.save(out)`;
execFileSync('/opt/qr-hermes/venv/bin/python3', ['-c', pythonSheet, referencePath, baselinePath, resolve(output,'artifacts/readable.png'), resolve(output,'artifacts/balanced.png'), resolve(output,'artifacts/image-first.png'), resolve(output,'artifacts/fallback.png'), resolve(output,'contact-sheet.png')]);
console.log(JSON.stringify({ output, candidates: candidates.map((candidate) => ({ mode: candidate.mode, checks: candidate.independent_validation.checks_passed, hash: candidate.artifact.sha256, recognition: candidate.recognition_score })) }, null, 2));
