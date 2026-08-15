#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
const root=resolve(new URL('../../..',import.meta.url).pathname),evidence=resolve(root,'docs/program/evidence/q8-quality-loop'),cycle4=resolve(evidence,'cycle-4-freeze-proposal');
const proposal=JSON.parse(readFileSync(resolve(cycle4,'scores.json'),'utf8')),verification=JSON.parse(readFileSync(resolve(cycle4,'verification.json'),'utf8')),loop=JSON.parse(readFileSync(resolve(evidence,'loop-state.json'),'utf8'));
PNG.sync.read(readFileSync(resolve(cycle4,'contact-sheet.png')));
if(proposal.proposal!=='freeze_for_product_architect_verification'||proposal.acceptance_claimed!==false)throw new Error('freeze proposal state invalid');
if(verification.qr_core.tests.passed!==24||verification.artistic_qr.typescript_tests.passed!==157||verification.artistic_qr.python_provider_tests.passed!==6)throw new Error('verification counts invalid');
if(verification.frozen_contract_diff!=='none'||verification.git_diff_check!=='pass')throw new Error('contract or diff gate failed');
for(const cycle of ['cycle-0-baseline','cycle-1-protected-island','cycle-2-negative-space','cycle-3-generalization','cycle-4-freeze-proposal'])execFileSync('sha256sum',['-c','sha256.txt'],{cwd:resolve(evidence,cycle),stdio:'ignore'});
execFileSync('sha256sum',['-c','sha256.txt'],{cwd:evidence,stdio:'ignore'});
console.log(JSON.stringify({pass:true,proposal:proposal.proposal,acceptance_claimed:false,tests:{core:24,typescript:157,python:6},manifests:6,loop_status:loop.status},null,2));
