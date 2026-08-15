#!/usr/bin/env node
import { chmodSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePayload } from '../../qr-core/dist/index.js';
import { generateCandidates } from '../dist/api/index.js';
const ROOT=resolve(new URL('../../..',import.meta.url).pathname);
const E=resolve(ROOT,'docs/program/evidence/level2-qr-specific-reference-q6');
const live=JSON.parse(readFileSync(resolve(E,'live-screen.json'),'utf8'));
const source=live.records.find(x=>x.status==='succeeded'&&x.artifacts?.length);
if(!source)throw new Error('Q6 replay artifact missing');
const artifact=source.artifacts[0];
const png=readFileSync(resolve(E,artifact.artifact)).toString('base64');
const board={boardId:'00000000-0000-4000-8000-000000000610',request:{},candidates:[{candidateId:'00000000-0000-4000-8000-000000000611',matrixRef:'q6-untrusted-provider',rendered:{format:'png-dataurl',data:`data:image/png;base64,${png}`,width:artifact.dimensions[0],height:artifact.dimensions[1]},scanResults:[{pass:true,decoder:'untrusted-provider',version:'0',thresholdVersion:'none',scannedPayload:live.payload,tests:[],overallConfidence:'high'}],exportAllowed:true,artisticScore:1,provenance:{generationMode:'provider_generative',provider:'replicate-replay',modelVersion:source.version,adapterVersion:'q6-evidence-replay',validationVersion:'untrusted',createdAt:new Date().toISOString()}}],status:'completed',failure:null,totalLatencyMs:source.predict_seconds*1000,totalCostEstimate:source.cost_estimate_usd};
const replay=resolve(E,'.q6-provider-replay.py');writeFileSync(replay,`#!/usr/bin/env python3\nimport sys\n_ = sys.stdin.read()\nprint(${JSON.stringify(JSON.stringify(board))})\n`);chmodSync(replay,0o700);
try{
 const normalizedPayload=normalizePayload({mode:'url',content:live.payload,errorCorrectionLevel:'H'});
 const result=await generateCandidates({normalizedPayload,mode:'provider_generative',prompt:'Q6 QR-specific reference evidence',referenceImage:{mimeType:'image/jpeg',width:512,height:512,hash:source.source_sha256},artisticStrength:0.72,seed:source.seed},{provider:{scriptPath:replay,maxAttempts:1,timeoutMs:30_000}});
 const proof={replayed_artifact:artifact.artifact,provider_claimed_export_allowed:true,core_rejected_provider_artifact:result.candidates.every(x=>x.provenance?.provider==='local-safe-fallback'),fallback_candidates:result.candidates.map(x=>({provider:x.provenance?.provider,export_allowed:x.exportAllowed,scan_pass:x.scanResults[0]?.pass,checks:`${x.scanResults[0]?.tests.filter(t=>t.pass).length}/${x.scanResults[0]?.tests.length}`,payload_match:x.scanResults[0]?.scannedPayload===live.payload}))};
 writeFileSync(resolve(E,'deterministic-fallback-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
}finally{rmSync(replay,{force:true});}
