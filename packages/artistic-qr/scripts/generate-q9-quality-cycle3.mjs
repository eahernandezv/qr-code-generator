#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/image-fit.js';
import { rasterizeCandidate, runValidation } from '../dist/validation.js';
const root = resolve(new URL('../../..', import.meta.url).pathname);
const output = resolve(root, 'docs/program/evidence/q9-quality-loop/cycle-3-generalization');
rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true });
const targets = [
  { id:'simple-silhouette', type:'simple silhouette', path:'docs/program/evidence/level2-image-fit-real-targets-q3/inputs/wolf-black-white.jpg', complexity:'simple_mark' },
  { id:'medium-logo', type:'medium logo / brand mark', path:'docs/program/handoffs/assets/q8-reference-logo.jpg', complexity:'medium_logo' },
  { id:'textured-subject', type:'photo-like / textured subject', path:'docs/program/evidence/level2-image-fit-real-targets-q3/inputs/red-wolf-front.jpg', complexity:'complex_photo_like' },
];
const pythonDecode = `from PIL import Image\nimport json,sys\nim=Image.open(sys.argv[1]).convert('RGB'); im.thumbnail((192,192),Image.Resampling.LANCZOS)\nrgb=[v for px in im.get_flattened_data() for v in px]\nluma=[round(.2126*rgb[i]+.7152*rgb[i+1]+.0722*rgb[i+2]) for i in range(0,len(rgb),3)]\nprint(json.dumps({'width':im.width,'height':im.height,'rgb':rgb,'luma':luma},separators=(',',':')))`;
const fixture = JSON.parse(readFileSync(resolve(root,'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'),'utf8')).request;
const payload='https://placeholder-online.com/r/bD7xQ2';
function validationCandidate(candidate,artifact){return{candidateId:candidate?.candidate_id??'fallback',matrixRef:candidate?`qr:${candidate.qr_settings.version}:${candidate.qr_settings.ecc}:${candidate.qr_settings.mask}`:'fallback',rendered:{format:'svg',data:artifact.data,width:1,height:1},scanResults:[],exportAllowed:false,artisticScore:0};}
function save(dir,label,artifact,candidate){writeFileSync(resolve(dir,`${label}.svg`),artifact.data);const raster=rasterizeCandidate(validationCandidate(candidate,artifact)),png=new PNG({width:raster.width,height:raster.height});png.data=Buffer.from(raster.data);writeFileSync(resolve(dir,`${label}.png`),PNG.sync.write(png));}
const evidenceTargets=[];
for(const definition of targets){
  const source=resolve(root,definition.path),bytes=readFileSync(source),digest=createHash('sha256').update(bytes).digest('hex');
  const target=JSON.parse(execFileSync('/opt/qr-hermes/venv/bin/python3',['-c',pythonDecode,source],{encoding:'utf8',maxBuffer:20_000_000}));
  const request=structuredClone(fixture);request.target_image={image_ref:definition.path,mime_type:'image/jpeg',width_px:target.width,height_px:target.height,sha256:digest,complexity:definition.complexity};request.constraints={...request.constraints,max_search_ms:60000,max_candidates:3};
  const input={schema_version:'image-fit-qr-api.v1',request,encoded_payload:payload,short_link:{slug:'bD7xQ2',state:'reserved',route:'/r/bD7xQ2'},target_luma:{width:target.width,height:target.height,values:target.luma,source_image_sha256:digest},target_rgb:{width:target.width,height:target.height,values:target.rgb,source_image_sha256:digest}};
  const options={_visualPolicy:'q9_negative_space_showcase'},result=optimizeImageFitQr(input,options),repeat=optimizeImageFitQr(input,options),artifactDir=resolve(output,definition.id,'artifacts');mkdirSync(artifactDir,{recursive:true});
  const candidates=result.response.candidates.map(candidate=>{const label=candidate.mode.replace('_','-'),artifact=result.artifacts[candidate.candidate_id],independent=runValidation(validationCandidate(candidate,artifact),payload),repeated=repeat.response.candidates.find(entry=>entry.mode===candidate.mode);save(artifactDir,label,artifact,candidate);return{mode:candidate.mode,candidate_id:candidate.candidate_id,settings:candidate.qr_settings,scan:candidate.scan_evidence,independent_validation:{pass:independent.pass,scanned_payload:independent.scannedPayload,payload_equal:independent.scannedPayload===payload,raw_decode:independent.tests.find(test=>test.name==='decode_raw')?.pass===true,checks_passed:independent.tests.filter(test=>test.pass).length,checks_total:independent.tests.length},recognition_score:candidate.image_fit_evidence.recognition_score,protected_conflict_score:candidate.image_fit_evidence.protected_zone_conflict_score,protected_violations:candidate.protected_regions.violations,export_parity:'not_claimed_export_locked',artifact:{sha256:artifact.sha256,path:`${definition.id}/artifacts/${label}.svg`},deterministic:repeated?.candidate_id===candidate.candidate_id&&repeated?.artifacts[0]?.sha256===candidate.artifacts[0].sha256};});
  save(artifactDir,'fallback',result.fallback_artifact);const fv=runValidation(validationCandidate(undefined,result.fallback_artifact),payload);
  evidenceTargets.push({id:definition.id,type:definition.type,source:{path:definition.path,sha256:digest,width:target.width,height:target.height},candidates,fallback:{independent_validation:{pass:fv.pass,scanned_payload:fv.scannedPayload,payload_equal:fv.scannedPayload===payload,raw_decode:fv.tests.find(test=>test.name==='decode_raw')?.pass===true,checks_passed:fv.tests.filter(test=>test.pass).length,checks_total:fv.tests.length},artifact_sha256:result.fallback_artifact.sha256,deterministic:repeat.fallback_artifact.sha256===result.fallback_artifact.sha256}});
}
writeFileSync(resolve(output,'objective-evidence.json'),JSON.stringify({schema_version:'q9-cycle-3-generalization.v1',visual_policy:'q9_negative_space_showcase',payload_sha256:createHash('sha256').update(payload).digest('hex'),targets:evidenceTargets},null,2)+'\n');
const args=[];for(const target of targets){args.push(resolve(root,target.path),resolve(output,target.id,'artifacts/readable.png'),resolve(output,target.id,'artifacts/balanced.png'),resolve(output,target.id,'artifacts/image-first.png'));}
const pythonSheet=`from PIL import Image,ImageDraw\nimport sys\npaths=sys.argv[1:-1];out=sys.argv[-1]; labels=['SOURCE','READABLE','BALANCED','IMAGE-FIRST']; W,H=330,360; sheet=Image.new('RGB',(W*4,H*3),(229,233,240));d=ImageDraw.Draw(sheet)\nfor i,path in enumerate(paths):\n im=Image.open(path).convert('RGB');im.thumbnail((300,290),Image.Resampling.LANCZOS);x=(i%4)*W+(W-im.width)//2;y=(i//4)*H+52;sheet.paste(im,(x,y));d.text(((i%4)*W+12,(i//4)*H+16),labels[i%4],fill=(17,24,39))\nfor row,name in enumerate(['SIMPLE SILHOUETTE','MEDIUM LOGO','TEXTURED SUBJECT']):d.text((8,row*H+36),name,fill=(60,70,90))\nsheet.save(out)`;
execFileSync('/opt/qr-hermes/venv/bin/python3',['-c',pythonSheet,...args,resolve(output,'contact-sheet.png')]);
console.log(JSON.stringify(evidenceTargets.map(target=>({target:target.id,candidates:target.candidates.map(candidate=>({mode:candidate.mode,checks:candidate.independent_validation.checks_passed,raw:candidate.independent_validation.raw_decode,pass:candidate.independent_validation.pass}))})),null,2));
