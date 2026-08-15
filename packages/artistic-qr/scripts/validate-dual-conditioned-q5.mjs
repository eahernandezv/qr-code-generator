#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { runValidation } from '../dist/validation.js';

const ROOT=resolve(new URL('../../..',import.meta.url).pathname);
const EVIDENCE=resolve(ROOT,'docs/program/evidence/level2-dual-conditioned-provider-q5');
const datasets=[
  {phase:'phase-a',data:JSON.parse(readFileSync(resolve(EVIDENCE,'phase-a-live.json'),'utf8'))},
  {phase:'tuning',data:JSON.parse(readFileSync(resolve(EVIDENCE,'tuning-live.json'),'utf8'))},
];
const results=[];
for(const {phase,data} of datasets) for(const item of data.results){
  const identity=item.architecture ?? item.variant;
  if(item.status!=='succeeded'){results.push({phase,identity,target:item.target,status:item.status,scan:null});continue;}
  const bytes=readFileSync(resolve(EVIDENCE,item.artifact));
  const png=PNG.sync.read(bytes);
  const candidate={candidateId:randomUUID(),matrixRef:`q5:${identity}:${item.target}`,rendered:{format:'png-dataurl',data:`data:image/png;base64,${bytes.toString('base64')}`,width:png.width,height:png.height},scanResults:[],exportAllowed:false,artisticScore:0};
  const scan=runValidation(candidate,data.payload);
  results.push({phase,identity,target:item.target,artifact:item.artifact,artifact_sha256:createHash('sha256').update(bytes).digest('hex'),scan,export_allowed_by_core:scan.pass});
  console.log(`${phase} ${identity} ${item.target}: ${scan.tests.filter(t=>t.pass).length}/${scan.tests.length} raw=${scan.tests[0]?.pass}`);
}
writeFileSync(resolve(EVIDENCE,'q5-validation.json'),JSON.stringify({threshold_version:'scan-v1-real-75pct',decoder:'jsQR 1.4.0',results},null,2)+'\n');
