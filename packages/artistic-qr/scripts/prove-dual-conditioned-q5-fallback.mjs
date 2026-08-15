#!/usr/bin/env node
import { chmodSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePayload } from '../../qr-core/dist/index.js';
import { generateCandidates } from '../dist/api/index.js';
const ROOT=resolve(new URL('../../..',import.meta.url).pathname);
const E=resolve(ROOT,'docs/program/evidence/level2-dual-conditioned-provider-q5');
const live=JSON.parse(readFileSync(resolve(E,'tuning-live.json'),'utf8'));
const source=live.results.find(x=>x.status==='succeeded'&&x.variant==='qr-heavy-3p0'&&x.target==='wolf-black-white');
if(!source)throw new Error('Q5 replay artifact missing');
const png=readFileSync(resolve(E,source.artifact)).toString('base64');
const board={boardId:'00000000-0000-4000-8000-000000000510',request:{},candidates:[{candidateId:'00000000-0000-4000-8000-000000000511',matrixRef:'q5-untrusted-provider',rendered:{format:'png-dataurl',data:`data:image/png;base64,${png}`,width:source.dimensions[0],height:source.dimensions[1]},scanResults:[{pass:true,decoder:'untrusted-provider',version:'0',thresholdVersion:'none',scannedPayload:live.payload,tests:[],overallConfidence:'high'}],exportAllowed:true,artisticScore:1,provenance:{generationMode:'provider_generative',provider:'replicate-replay',modelVersion:live.model,adapterVersion:'q5-evidence-replay',validationVersion:'untrusted',createdAt:new Date().toISOString()}}],status:'completed',failure:null,totalLatencyMs:source.predict_seconds*1000,totalCostEstimate:source.cost_estimate_usd};
const replay=resolve(E,'.q5-provider-replay.py');writeFileSync(replay,`#!/usr/bin/env python3\nimport sys\n_ = sys.stdin.read()\nprint(${JSON.stringify(JSON.stringify(board))})\n`);chmodSync(replay,0o700);
try{
 const normalizedPayload=normalizePayload({mode:'url',content:live.payload,errorCorrectionLevel:'H'});
 const result=await generateCandidates({normalizedPayload,mode:'provider_generative',prompt:'dual-conditioned quality evidence',referenceImage:{mimeType:'image/jpeg',width:768,height:768,hash:source.source_sha256},artisticStrength:0.72,seed:source.seed},{provider:{scriptPath:replay,maxAttempts:1,timeoutMs:30_000}});
 const proof={replayed_artifact:source.artifact,provider_claimed_export_allowed:true,core_rejected_provider_artifact:result.candidates.every(x=>x.provenance?.provider==='local-safe-fallback'),fallback_candidates:result.candidates.map(x=>({provider:x.provenance?.provider,export_allowed:x.exportAllowed,scan_pass:x.scanResults[0]?.pass,checks:`${x.scanResults[0]?.tests.filter(t=>t.pass).length}/${x.scanResults[0]?.tests.length}`,payload_match:x.scanResults[0]?.scannedPayload===live.payload}))};
 writeFileSync(resolve(E,'deterministic-fallback-proof.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof,null,2));
}finally{rmSync(replay,{force:true});}
