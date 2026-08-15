#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { runValidation } from '../dist/validation.js';

const ROOT=resolve(new URL('../../..',import.meta.url).pathname);
const EVIDENCE=resolve(ROOT,'docs/program/evidence/level2-qr-specific-reference-q6');
const data=JSON.parse(readFileSync(resolve(EVIDENCE,'live-screen.json'),'utf8'));
const results=[];
for(const record of data.records){
  if(record.status!=='succeeded'){
    results.push({architecture:record.architecture,target:record.target,batch:record.batch,status:record.status,error:record.error,scan:null});
    continue;
  }
  for(let output=0;output<record.artifacts.length;output++){
    const item=record.artifacts[output];
    const bytes=readFileSync(resolve(EVIDENCE,item.artifact));
    const png=PNG.sync.read(bytes);
    const candidate={candidateId:randomUUID(),matrixRef:`q6:${record.architecture}:${record.target}:${record.batch}:${output}`,rendered:{format:'png-dataurl',data:`data:image/png;base64,${bytes.toString('base64')}`,width:png.width,height:png.height},scanResults:[],exportAllowed:false,artisticScore:0};
    const scan=runValidation(candidate,data.payload);
    results.push({architecture:record.architecture,target:record.target,batch:record.batch,output,artifact:item.artifact,artifact_sha256:createHash('sha256').update(bytes).digest('hex'),scan,export_allowed_by_core:scan.pass});
    console.log(`${record.architecture} ${record.target} b${record.batch}o${output}: ${scan.tests.filter(t=>t.pass).length}/${scan.tests.length} raw=${scan.tests[0]?.pass}`);
  }
}
const successful=results.filter(x=>x.scan);
writeFileSync(resolve(EVIDENCE,'q6-validation.json'),JSON.stringify({threshold_version:'scan-v1-real-75pct',decoder:'jsQR 1.4.0',payload:data.payload,summary:{provider_outputs:successful.length,raw_decode:successful.filter(x=>x.scan.tests[0]?.pass).length,core_pass:successful.filter(x=>x.scan.pass).length,export_denied:successful.filter(x=>!x.export_allowed_by_core).length},results},null,2)+'\n');
