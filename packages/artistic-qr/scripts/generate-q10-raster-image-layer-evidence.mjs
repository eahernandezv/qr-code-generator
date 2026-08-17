#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/image-fit.js';
import { rasterizeCandidate, runValidation } from '../dist/validation.js';

const root = resolve(new URL('../../..', import.meta.url).pathname);
const output = resolve(root, 'docs/program/evidence/q10-raster-image-layer');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const fixture = JSON.parse(readFileSync(resolve(root, 'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'), 'utf8')).request;
const payload = 'https://placeholder-online.com/r/bD7xQ2';
const targetDef = { id: 'medium-logo', path: 'docs/program/handoffs/assets/q8-reference-logo.jpg', complexity: 'medium_logo' };
const pythonDecode = `from PIL import Image\nimport json,sys\nim=Image.open(sys.argv[1]).convert('RGB'); im.thumbnail((192,192),Image.Resampling.LANCZOS)\nrgb=[v for px in im.getdata() for v in px]\nluma=[round(.2126*rgb[i]+.7152*rgb[i+1]+.0722*rgb[i+2]) for i in range(0,len(rgb),3)]\nprint(json.dumps({'width':im.width,'height':im.height,'rgb':rgb,'luma':luma},separators=(',',':')))`;
const source = resolve(root, targetDef.path);
const bytes = readFileSync(source);
const digest = createHash('sha256').update(bytes).digest('hex');
const target = JSON.parse(execFileSync('/opt/qr-hermes/venv/bin/python3', ['-c', pythonDecode, source], { encoding: 'utf8', maxBuffer: 20_000_000 }));
const request = structuredClone(fixture);
request.target_image = { image_ref: targetDef.path, mime_type: 'image/jpeg', width_px: target.width, height_px: target.height, sha256: digest, complexity: targetDef.complexity };
request.constraints = { ...request.constraints, max_search_ms: 60_000, max_candidates: 12 };
const input = {
  schema_version: 'image-fit-qr-api.v1', request, encoded_payload: payload,
  short_link: { slug: 'bD7xQ2', state: 'reserved', route: '/r/bD7xQ2' },
  target_luma: { width: target.width, height: target.height, values: target.luma, source_image_sha256: digest },
  target_rgb: { width: target.width, height: target.height, values: target.rgb, source_image_sha256: digest },
};

function validationCandidate(candidate, artifact) {
  return {
    candidateId: candidate?.candidate_id ?? 'fallback',
    matrixRef: candidate ? `qr:${candidate.qr_settings.version}:${candidate.qr_settings.ecc}:${candidate.qr_settings.mask}` : 'fallback',
    rendered: { format: artifact.media_type === 'image/png' ? 'png-dataurl' : 'svg', data: artifact.data, width: 1, height: 1 },
    scanResults: [], exportAllowed: false, artisticScore: 0,
  };
}
function savePng(candidate, artifact, path) {
  if (artifact.media_type === 'image/png') {
    const encoded = artifact.data.replace(/^data:image\/png;base64,/, '');
    writeFileSync(path, Buffer.from(encoded, 'base64'));
    return;
  }
  writeFileSync(path.replace(/\.png$/, '.svg'), artifact.data);
  const raster = rasterizeCandidate(validationCandidate(candidate, artifact));
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  writeFileSync(path, PNG.sync.write(png));
}
function runVariant(id, visualPolicy) {
  const result = optimizeImageFitQr(input, { _visualPolicy: visualPolicy });
  const dir = resolve(output, id);
  mkdirSync(dir, { recursive: true });
  const records = [];
  for (const candidate of result.response.candidates) {
    const artifact = result.artifacts[candidate.candidate_id];
    const independent = runValidation(validationCandidate(candidate, artifact), payload);
    const label = `${candidate.image_treatment.logo_size}-${Math.round((candidate.image_treatment.logo_size_fraction ?? 0) * 100)}`;
    savePng(candidate, artifact, resolve(dir, `${label}.png`));
    records.push({
      label, size: candidate.image_treatment.logo_size, fraction: candidate.image_treatment.logo_size_fraction,
      candidate_id: candidate.candidate_id, artifact_kind: artifact.kind, artifact_media_type: artifact.media_type,
      artifact_sha256: artifact.sha256,
      pass: independent.pass, raw_decode: independent.tests.find((test) => test.name === 'decode_raw')?.pass === true,
      payload_equal: independent.scannedPayload === payload, checks_passed: independent.tests.filter((test) => test.pass).length,
      checks_total: independent.tests.length, protected_violations: candidate.protected_regions.violations,
      recognition_score: candidate.image_fit_evidence.recognition_score,
    });
  }
  return records;
}
const q9 = runVariant('q9-svg-current', 'q9_negative_space_showcase');
const q10 = runVariant('q10-raster-layer', 'q10_raster_image_layer');
const manifest = { schema_version: 'q10-raster-image-layer.v1', payload, target: { ...targetDef, sha256: digest, width: target.width, height: target.height }, variants: { 'q9-svg-current': q9, 'q10-raster-layer': q10 } };
writeFileSync(resolve(output, 'objective-evidence.json'), JSON.stringify(manifest, null, 2) + '\n');

const sheetPy = `from PIL import Image,ImageDraw\nimport sys,json,os\nroot=sys.argv[1]; manifest=json.load(open(os.path.join(root,'objective-evidence.json'))); W,H=300,350; cols=['source','small','medium','large']; rows=['q9-svg-current','q10-raster-layer']; sheet=Image.new('RGB',(W*4,H*2),(229,233,240)); d=ImageDraw.Draw(sheet)\nsource=Image.open('${source}').convert('RGB'); source.thumbnail((260,250),Image.Resampling.LANCZOS)\nfor row_id,row in enumerate(rows):\n d.text((8,row_id*H+10),row,fill=(17,24,39))\n for col_id,col in enumerate(cols):\n  x=col_id*W; y=row_id*H\n  if col=='source': im=source.copy(); label='SOURCE'\n  else:\n   rec=next((r for r in manifest['variants'][row] if r['size']==col),None)\n   if rec is None:\n    d.text((x+32,y+150),'not qualified',fill=(148,43,43)); continue\n   im=Image.open(os.path.join(root,row,rec['label']+'.png')).convert('RGB'); label=col.upper()+' '+str(round(rec['fraction']*100))+'% '+str(rec['checks_passed'])+'/'+str(rec['checks_total'])\n  im.thumbnail((260,260),Image.Resampling.LANCZOS); sheet.paste(im,(x+(W-im.width)//2,y+58)); d.text((x+12,y+34),label,fill=(17,24,39))\nsheet.save(os.path.join(root,'contact-sheet.png'))`;
execFileSync('/opt/qr-hermes/venv/bin/python3', ['-c', sheetPy, output]);
console.log(JSON.stringify(manifest, null, 2));
