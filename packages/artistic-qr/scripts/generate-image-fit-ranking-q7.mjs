#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { optimizeImageFitQr } from '../dist/image-fit.js';
import { rasterizeCandidate } from '../dist/validation.js';

const ROOT=resolve(new URL('../../..',import.meta.url).pathname);
const Q3=resolve(ROOT,'docs/program/evidence/level2-image-fit-real-targets-q3');
const OUT=resolve(ROOT,'docs/program/evidence/level2-image-fit-ranking-q7');
const LOCAL=resolve(OUT,'local-artifacts');
const FIXTURE=JSON.parse(readFileSync(resolve(ROOT,'packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'),'utf8'));
const META={
 'letter-j-gradient.jpg':['letter-j-gradient','medium_logo'],
 'geometric-media-mark.jpg':['geometric-media-mark','high_risk_thin_detail'],
 'gradient-m-mark.jpg':['gradient-m-mark','medium_logo'],
 'red-wolf-front.jpg':['red-wolf-front','complex_photo_like'],
 'burger-brand-reference.jpg':['burger-brand-reference','high_risk_thin_detail'],
 'wolf-black-white.jpg':['wolf-black-white','complex_photo_like'],
 'wolf-profile-watermarked.jpg':['wolf-profile-watermarked','complex_photo_like'],
 'calligraphic-j-heart.jpg':['calligraphic-j-heart','high_risk_thin_detail'],
};
const sha=value=>createHash('sha256').update(value).digest('hex');
function luma(path){const code=`from PIL import Image\nimport json,sys\nim=Image.open(sys.argv[1]).convert('RGB'); im.thumbnail((160,160),Image.Resampling.LANCZOS)\nprint(json.dumps({'width':im.width,'height':im.height,'values':[round(.2126*r+.7152*g+.0722*b) for r,g,b in im.get_flattened_data()]},separators=(',',':')))`;return JSON.parse(execFileSync('/opt/qr-hermes/venv/bin/python3',['-c',code,path],{encoding:'utf8',maxBuffer:8*1024*1024}));}
function inputFor(target,bytes,name,complexity){const digest=sha(bytes);return {schema_version:'image-fit-qr-api.v1',request:{...structuredClone(FIXTURE.request),request_id:`q7-${name}`,target_image:{image_ref:`rights-restricted://${name}`,mime_type:'image/jpeg',width_px:target.width,height_px:target.height,sha256:digest,complexity},constraints:{...FIXTURE.request.constraints,max_candidates:3,max_search_ms:60000}},encoded_payload:'https://placeholder-online.com/r/bD7xQ2',short_link:{slug:'bD7xQ2',state:'reserved',route:'/r/bD7xQ2'},target_luma:{...target,source_image_sha256:digest}};}
function raster(result,candidate){const artifact=result.artifacts[candidate.candidate_id];return rasterizeCandidate({candidateId:candidate.candidate_id,matrixRef:`qr:${candidate.qr_settings.version}:${candidate.qr_settings.mask}`,rendered:{format:'svg',data:artifact.data,width:1,height:1},scanResults:[],exportAllowed:false,artisticScore:0});}
function contact(path,target,q3,q7){const panel=Math.max(q3.width,q7.width),gap=12,header=18,out=new PNG({width:panel*3+gap*2,height:panel+header});out.data.fill(255);const colors=[[110,110,110,255],[214,156,46,255],[45,126,190,255]];for(let p=0;p<3;p++)for(let y=0;y<header;y++)for(let x=0;x<panel;x++)out.data.set(colors[p],(y*out.width+p*(panel+gap)+x)*4);for(let y=0;y<panel;y++)for(let x=0;x<panel;x++){const sx=Math.min(target.width-1,Math.floor(x*target.width/panel)),sy=Math.min(target.height-1,Math.floor(y*target.height/panel)),v=target.values[sy*target.width+sx],i=((y+header)*out.width+x)*4;out.data.set([v,v,v,255],i);}for(const [r,dx] of [[q3,panel+gap],[q7,(panel+gap)*2]])for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){const si=(y*r.width+x)*4,di=((y+header)*out.width+dx+x)*4;out.data.set(r.data.subarray(si,si+4),di);}writeFileSync(path,PNG.sync.write(out));}
function row(candidate){return {settings:{version:candidate.qr_settings.version,ecc:candidate.qr_settings.ecc,mask:candidate.qr_settings.mask},scan:{verdict:candidate.scan_evidence.verdict,checks_passed:candidate.scan_evidence.checks_passed,checks_total:candidate.scan_evidence.checks_total},recognition_score:candidate.image_fit_evidence.recognition_score,score_version:candidate.image_fit_evidence.score_version,protected_violations:candidate.protected_regions.violations.length,export_allowed:candidate.export_authority.export_allowed,artifact_sha256:candidate.artifacts[0].sha256};}
rmSync(LOCAL,{recursive:true,force:true});mkdirSync(LOCAL,{recursive:true});
const evidence={schema_version:'image-fit-ranking-q7-evidence.v1',decoder_scope:'Automated jsQR 1.4.0 perturbation suite only; no physical-device or print scan performed.',rights:'Reference pixels and source-bearing derivatives remain local and git-ignored.',targets:[]};
for(const file of readdirSync(resolve(Q3,'inputs')).filter(x=>META[x]).sort()){const [name,complexity]=META[file],path=resolve(Q3,'inputs',file),bytes=readFileSync(path),target=luma(path),input=inputFor(target,bytes,name,complexity);const q3=optimizeImageFitQr(input,{_selectionPolicy:'q3_first_pass'}),q7=optimizeImageFitQr(input,{_selectionPolicy:'q7_ranked'});const targetRow={target:name,source_sha256:sha(bytes),modes:[],fallback:{q3:rowFallback(q3),q7:rowFallback(q7)}};for(const mode of ['readable','balanced','image_first']){const a=q3.response.candidates.find(x=>x.mode===mode),b=q7.response.candidates.find(x=>x.mode===mode);if(!a||!b)continue;targetRow.modes.push({mode,q3:row(a),q7:row(b),setting_changed:JSON.stringify(row(a).settings)!==JSON.stringify(row(b).settings),checks_delta:b.scan_evidence.checks_passed-a.scan_evidence.checks_passed,appearance_delta:+(b.image_fit_evidence.recognition_score-a.image_fit_evidence.recognition_score).toFixed(6)});contact(resolve(LOCAL,`${name}--${mode}.png`),target,raster(q3,a),raster(q7,b));}evidence.targets.push(targetRow);console.log(`completed ${name}`);}
function rowFallback(result){return {verdict:result.fallback_scan_evidence.verdict,checks_passed:result.fallback_scan_evidence.checks_passed,checks_total:result.fallback_scan_evidence.checks_total,sha256:result.fallback_artifact.sha256};}
const modes=evidence.targets.flatMap(x=>x.modes),summary={targets:evidence.targets.length,candidates:modes.length,q3_pass:modes.filter(x=>x.q3.scan.verdict==='pass').length,q7_pass:modes.filter(x=>x.q7.scan.verdict==='pass').length,q3_checks:modes.reduce((n,x)=>n+x.q3.scan.checks_passed,0),q7_checks:modes.reduce((n,x)=>n+x.q7.scan.checks_passed,0),settings_changed:modes.filter(x=>x.setting_changed).length,appearance_improved:modes.filter(x=>x.appearance_delta>0).length,appearance_equal:modes.filter(x=>x.appearance_delta===0).length,appearance_regressed:modes.filter(x=>x.appearance_delta<0).length,fallback_pass:evidence.targets.filter(x=>x.fallback.q7.verdict==='pass').length};
evidence.summary=summary;writeFileSync(resolve(OUT,'ranking-evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
