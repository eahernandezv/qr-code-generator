#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const ROOT=resolve(new URL('../../..',import.meta.url).pathname),E=resolve(ROOT,'docs/program/evidence/level2-image-fit-ranking-q7');
const evidence=JSON.parse(readFileSync(resolve(E,'ranking-evidence.json'),'utf8'));
const visual=JSON.parse(readFileSync(resolve(E,'visual-review.json'),'utf8'));
const modes=evidence.targets.flatMap(target=>target.modes);
const fail=(message)=>{throw new Error(message)};
if(evidence.summary.targets!==8||evidence.summary.candidates!==24)fail('target/candidate count mismatch');
if(evidence.summary.q3_pass!==24||evidence.summary.q7_pass!==24)fail('scan-pass regression');
if(evidence.summary.q7_checks<evidence.summary.q3_checks)fail('aggregate scan-check regression');
if(modes.some(mode=>mode.q7.scan.checks_passed<mode.q3.scan.checks_passed))fail('per-candidate scan-check regression');
if(modes.some(mode=>mode.q7.protected_violations!==0||mode.q7.export_allowed!==false))fail('protected/export fail-closed mismatch');
if(modes.some(mode=>mode.appearance_delta<0))fail('appearance regression');
if(evidence.summary.fallback_pass!==8||evidence.targets.some(target=>target.fallback.q7.verdict!=='pass'))fail('fallback mismatch');
if(modes.some(mode=>mode.q7.score_version!=='image-fit-scan-first-appearance-q7'))fail('score version mismatch');
if(visual.summary.sponsor_quality!==0||visual.summary.visible_regressions!==0)fail('visual review mismatch');
console.log(JSON.stringify({pass:true,...evidence.summary,minimum_candidate_checks_delta:Math.min(...modes.map(mode=>mode.checks_delta)),minimum_appearance_delta:Math.min(...modes.map(mode=>mode.appearance_delta)),sponsor_quality:visual.summary.sponsor_quality},null,2));
