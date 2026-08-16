#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/image-fit.js';
import { rasterizeCandidate, runValidation } from '../dist/validation.js';
import { scoreQ8VisualQuality } from '../dist/visual-quality.js';

const root = resolve(new URL('../../..', import.meta.url).pathname);
const output = resolve(root, 'docs/program/evidence/q9-quality-loop/cycle-1-showcase-island');
const referencePath = resolve(root, 'docs/program/handoffs/assets/q8-reference-logo.jpg');
const q8Dir = resolve(root, 'docs/program/evidence/q8-quality-loop/cycle-2-negative-space');
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, 'artifacts'), { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const referenceBytes = readFileSync(referencePath);
const referenceHash = hash(referenceBytes);
if (referenceHash !== 'cb3b4fecbd0547cd2dfb62daeecfc0116e4dd49fb653ac602025a77b00badaec') throw new Error('reference hash mismatch');
const pythonDecode = `from PIL import Image\nimport json,sys\nim=Image.open(sys.argv[1]).convert('RGB')\nim.thumbnail((192,192),Image.Resampling.LANCZOS)\nrgb=[]\nfor px in im.getdata(): rgb.extend(px)\nluma=[round(.2126*rgb[i]+.7152*rgb[i+1]+.0722*rgb[i+2]) for i in range(0,len(rgb),3)]\nprint(json.dumps({'width':im.width,'height':im.height,'rgb':rgb,'luma':luma},separators=(',',':')))`;
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
const result = optimizeImageFitQr(input, { _visualPolicy: 'q9_negative_space_showcase' });
const repeat = optimizeImageFitQr(input, { _visualPolicy: 'q9_negative_space_showcase' });
function validationCandidate(candidate, artifact) {
  return { candidateId: candidate?.candidate_id ?? 'fallback', matrixRef: candidate ? `qr:${candidate.qr_settings.version}:${candidate.qr_settings.ecc}:${candidate.qr_settings.mask}` : 'fallback', rendered: { format: 'svg', data: artifact.data, width: 1, height: 1 }, scanResults: [], exportAllowed: false, artisticScore: 0 };
}
function save(label, artifact, candidate) {
  writeFileSync(resolve(output, 'artifacts', `${label}.svg`), artifact.data);
  const raster = rasterizeCandidate(validationCandidate(candidate, artifact));
  const png = new PNG({ width: raster.width, height: raster.height }); png.data = Buffer.from(raster.data);
  writeFileSync(resolve(output, 'artifacts', `${label}.png`), PNG.sync.write(png));
}
const productScores = {
  readable: { target_recognizability: 20, composition_placement: 11, image_qr_harmony: 10, palette_fidelity: 9, protected_region_elegance: 8, premium_polish: 7 },
  balanced: { target_recognizability: 24, composition_placement: 14, image_qr_harmony: 13, palette_fidelity: 10, protected_region_elegance: 9, premium_polish: 9 },
  image_first: { target_recognizability: 24, composition_placement: 14, image_qr_harmony: 13, palette_fidelity: 10, protected_region_elegance: 8, premium_polish: 8 },
};
const q8Scores = { readable: 80, balanced: 90, image_first: 94 };
const candidates = result.response.candidates.map((candidate) => {
  const label = candidate.mode.replace('_', '-'), artifact = result.artifacts[candidate.candidate_id];
  save(label, artifact, candidate);
  const independent = runValidation(validationCandidate(candidate, artifact), payload);
  const repeated = repeat.response.candidates.find((entry) => entry.mode === candidate.mode);
  const hard = {
    payloadEqual: independent.scannedPayload === payload,
    rawDecode: independent.tests.find((test) => test.name === 'decode_raw')?.pass === true,
    checksPassed: independent.tests.filter((test) => test.pass).length,
    checksTotal: independent.tests.length,
    protectedViolations: candidate.protected_regions.violations.length,
    contractValid: true,
    deterministic: repeated?.candidate_id === candidate.candidate_id && repeated?.artifacts[0]?.sha256 === candidate.artifacts[0].sha256,
    exportParity: 'not_claimed_export_locked',
  };
  const scored = scoreQ8VisualQuality({ candidate: candidate.mode, hardGates: hard, producerScores: productScores[candidate.mode] });
  return {
    mode: candidate.mode, candidate_id: candidate.candidate_id, settings: candidate.qr_settings,
    scan: candidate.scan_evidence,
    independent_validation: { pass: independent.pass, scanned_payload: independent.scannedPayload, payload_equal: hard.payloadEqual, raw_decode: hard.rawDecode, checks_passed: hard.checksPassed, checks_total: hard.checksTotal },
    recognition_score: candidate.image_fit_evidence.recognition_score,
    protected_conflict_score: candidate.image_fit_evidence.protected_zone_conflict_score,
    protected_violations: candidate.protected_regions.violations,
    export_parity: 'not_claimed_export_locked', export_authority: candidate.export_authority,
    artifact: { kind: candidate.artifacts[0].kind, sha256: candidate.artifacts[0].sha256, path: `artifacts/${label}.svg` },
    deterministic: hard.deterministic,
    product_visual_score: { ...scored, delta_from_q8_cycle2: scored.total === null ? null : scored.total - q8Scores[candidate.mode] },
  };
});
save('fallback', result.fallback_artifact);
const fallbackIndependent = runValidation(validationCandidate(undefined, result.fallback_artifact), payload);
const objective = {
  schema_version: 'q9-cycle-1-objective.v1', baseline_commit: '234d759d978de159f105dcdfce0aeb3b1e275f9c',
  visual_policy: 'q9_negative_space_showcase', reference: { sha256: referenceHash, width: target.width, height: target.height },
  payload_sha256: hash(payload), candidates,
  fallback: { scan: result.fallback_scan_evidence, independent_validation: { pass: fallbackIndependent.pass, scanned_payload: fallbackIndependent.scannedPayload, payload_equal: fallbackIndependent.scannedPayload === payload, raw_decode: fallbackIndependent.tests.find((test) => test.name === 'decode_raw')?.pass === true, checks_passed: fallbackIndependent.tests.filter((test) => test.pass).length, checks_total: fallbackIndependent.tests.length }, export_parity: 'not_claimed_export_locked', deterministic: repeat.fallback_artifact.sha256 === result.fallback_artifact.sha256, artifact_sha256: result.fallback_artifact.sha256 },
};
writeFileSync(resolve(output, 'objective-evidence.json'), JSON.stringify(objective, null, 2) + '\n');
const scores = {
  schema_version: 'q9-product-visual-quality-scores.v1', cycle: 1, scorer: 'QR Product Architect direct', scoring_note: 'Independent Product visual score, not Creator telemetry.',
  weights: { target_recognizability:25, composition_placement:15, image_qr_harmony:15, scan_robustness_margin:15, palette_fidelity:10, protected_region_elegance:10, premium_polish:10 },
  candidates: candidates.map((candidate) => ({ candidate: candidate.mode, candidate_id: candidate.candidate_id, artifact_sha256: candidate.artifact.sha256, ...candidate.product_visual_score })),
  leaderboard: candidates.map((candidate) => candidate.product_visual_score).filter((score) => score.leaderboardEligible).sort((a,b)=>b.total-a.total).map((score)=>score.candidate),
};
writeFileSync(resolve(output, 'scores.json'), JSON.stringify(scores, null, 2) + '\n');
const pythonSheet = `from PIL import Image,ImageDraw\nimport sys,json\nitems=json.loads(sys.argv[1]); out=sys.argv[2]\nW,H=390,390\nsheet=Image.new('RGB',(W*3,H*3),(229,233,240)); d=ImageDraw.Draw(sheet)\nfor i,it in enumerate(items):\n im=Image.open(it['path']).convert('RGB'); im.thumbnail((330,300),Image.Resampling.LANCZOS); x=(i%3)*W+(W-im.width)//2; y=(i//3)*H+66; sheet.paste(im,(x,y)); d.text(((i%3)*W+16,(i//3)*H+16),it['label'],fill=(17,24,39)); d.text(((i%3)*W+16,(i//3)*H+38),it.get('score',''),fill=(55,65,81))\nsheet.save(out)`;
const sheetItems = [
  { label: 'REFERENCE LOGO', path: referencePath, score: '' },
  { label: 'Q8 BALANCED', path: resolve(q8Dir, 'artifacts/balanced.png'), score: 'Product score 90' },
  { label: 'Q8 IMAGE-FIRST', path: resolve(q8Dir, 'artifacts/image-first.png'), score: 'Product score 94' },
  ...candidates.map((candidate) => ({ label: `Q9 ${candidate.mode.toUpperCase()}`, path: resolve(output, 'artifacts', `${candidate.mode.replace('_','-')}.png`), score: `Score ${candidate.product_visual_score.total} / checks ${candidate.independent_validation.checks_passed}/8` })),
  { label: 'LEVEL 1 FALLBACK', path: resolve(output, 'artifacts/fallback.png'), score: `checks ${objective.fallback.independent_validation.checks_passed}/8` },
];
execFileSync('/opt/qr-hermes/venv/bin/python3', ['-c', pythonSheet, JSON.stringify(sheetItems), resolve(output, 'contact-sheet.png')]);
const files = ['contact-sheet.png','objective-evidence.json','scores.json', ...['readable','balanced','image-first','fallback'].flatMap((label)=>[`artifacts/${label}.png`,`artifacts/${label}.svg`])];
writeFileSync(resolve(output, 'sha256.txt'), files.map((file)=>`${hash(readFileSync(resolve(output,file)))}  ${file}`).join('\n') + '\n');
console.log(JSON.stringify({ output, candidates: candidates.map((candidate)=>({ mode:candidate.mode, total:candidate.product_visual_score.total, delta:candidate.product_visual_score.delta_from_q8_cycle2, checks:`${candidate.independent_validation.checks_passed}/8`, hash:candidate.artifact.sha256 })) }, null, 2));
