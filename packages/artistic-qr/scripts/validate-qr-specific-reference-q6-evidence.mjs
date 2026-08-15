#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
const ROOT=resolve(new URL('../../..',import.meta.url).pathname);
const E=resolve(ROOT,'docs/program/evidence/level2-qr-specific-reference-q6');
const j=n=>JSON.parse(readFileSync(resolve(E,n),'utf8'));
const live=j('live-screen.json'),failed=j('provider-failed-attempts.json'),validation=j('q6-validation.json'),visual=j('visual-review.json'),fallback=j('deterministic-fallback-proof.json'),loop=j('loop-state.json');
const successful=live.records.filter(x=>x.status==='succeeded');
const artifacts=successful.flatMap(x=>x.artifacts);
if(live.records.length!==8||successful.length!==4||artifacts.length!==16)throw new Error('live counts mismatch');
if(failed.records.length!==5||failed.records.filter(x=>x.status==='failed').length!==4||failed.records.filter(x=>x.status==='canceled').length!==1)throw new Error('failed-attempt recovery mismatch');
if(validation.summary.provider_outputs!==16||validation.summary.raw_decode!==0||validation.summary.core_pass!==0||validation.summary.export_denied!==16)throw new Error('scan summary mismatch');
if(visual.summary.clear_reference!==7||visual.summary.sponsor_ready!==0)throw new Error('visual summary mismatch');
if(!fallback.core_rejected_provider_artifact||fallback.fallback_candidates.length!==4||!fallback.fallback_candidates.every(x=>x.export_allowed&&x.scan_pass&&x.payload_match))throw new Error('fallback proof mismatch');
if(loop.criteria.find(x=>x.id==='Q6-C3')?.status!=='FAIL')throw new Error('loop gate mismatch');
for(const a of artifacts){const bytes=readFileSync(resolve(E,a.artifact));if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw new Error(`hash mismatch: ${a.artifact}`);PNG.sync.read(bytes);}
const successfulCost=successful.reduce((n,x)=>n+x.cost_estimate_usd,0),failedCost=failed.records.reduce((n,x)=>n+x.cost_estimate_usd,0);
console.log(JSON.stringify({pass:true,records:live.records.length,successful_predictions:successful.length,provider_outputs:artifacts.length,raw_decode:0,core_pass:0,export_denied:16,clear_reference:visual.summary.clear_reference,sponsor_ready:0,fallbacks:4,successful_cost_usd:+successfulCost.toFixed(6),failed_cost_usd:+failedCost.toFixed(6),total_cost_usd:+(successfulCost+failedCost).toFixed(6)},null,2));
