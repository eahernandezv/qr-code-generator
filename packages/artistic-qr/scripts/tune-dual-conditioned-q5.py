#!/usr/bin/env python3
"""Q5 bounded remediation: QR-control strength sweep on the best reference-preserving architecture."""
import base64, hashlib, io, json, os, time, urllib.error, urllib.request
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[3]
E=ROOT/'docs/program/evidence/level2-dual-conditioned-provider-q5'; A=E/'local-artifacts'
LIVE=json.loads((E/'phase-a-live.json').read_text()); VERSION=LIVE['version']; MODEL=LIVE['model']; PAYLOAD=LIVE['payload']; PRICE=LIVE['price_per_predict_second_usd']
CACHE=Path('/home/hermes/.hermes/cache/images'); CONTROL=(E/'qr-control.png').read_bytes()
TARGETS=[
 {'id':'gradient-m-ribbon','file':'img_1e0fb190b4b2.jpg','seed':5203,'prompt':'premium minimal abstract capital M made from crossing rounded ribbons, cyan blue violet gradient, centered, preserve the supplied emblem geometry, visibly integrate a square modular QR texture, no additional words'},
 {'id':'wolf-black-white','file':'img_69cef2893b9c.jpg','seed':5206,'prompt':'high contrast black and white front-facing wolf face illustration with luminous eyes, preserve supplied identity, visibly integrate square modular QR texture throughout the fur, no words'},]
VARIANTS=[{'id':'qr-heavy-2p0','prompt_strength':0.62,'qr_scale':2.0},{'id':'qr-heavy-3p0','prompt_strength':0.72,'qr_scale':3.0}]
def token():
 v=os.environ.get('REPLICATE_API_TOKEN','').strip()
 if not v: raise RuntimeError('REPLICATE_API_TOKEN required')
 return v
def api(method,path,payload=None,timeout=60):
 req=urllib.request.Request('https://api.replicate.com/v1'+path,data=json.dumps(payload).encode() if payload else None,method=method,headers={'Authorization':'Token '+token(),'Content-Type':'application/json','User-Agent':'curl/8.5.0'})
 try:
  with urllib.request.urlopen(req,timeout=timeout) as r:return json.load(r)
 except urllib.error.HTTPError as x: raise RuntimeError(f'Replicate HTTP {x.code}: {x.read(600).decode("utf-8","replace")}')
def uri(b):return 'data:image/png;base64,'+base64.b64encode(b).decode()
def h(b):return hashlib.sha256(b).hexdigest()
def reference(path):
 src=path.read_bytes(); im=Image.open(io.BytesIO(src)).convert('RGB'); im.thumbnail((704,704),Image.Resampling.LANCZOS); c=Image.new('RGB',(768,768),'white'); c.paste(im,((768-im.width)//2,(768-im.height)//2)); o=io.BytesIO(); c.save(o,'PNG',optimize=True); return src,o.getvalue()
def predict(inputs):
 pred=None
 for attempt in range(4):
  try: pred=api('POST','/predictions',{'version':VERSION,'input':inputs}); break
  except RuntimeError as x:
   if 'HTTP 429' not in str(x) or attempt==3: raise
   time.sleep(4+2*attempt)
 if not pred: raise RuntimeError('prediction creation failed')
 for _ in range(100):
  time.sleep(3); cur=api('GET','/predictions/'+pred['id'],timeout=30)
  if cur['status'] in ('succeeded','failed','canceled'):
   if cur['status']!='succeeded':raise RuntimeError(f"prediction {cur['status']}: {str(cur.get('error'))[:300]}")
   return cur
 api('POST','/predictions/'+pred['id']+'/cancel',timeout=10); raise RuntimeError('prediction timeout')
def output(url):
 req=urllib.request.Request(url,headers={'User-Agent':'curl/8.5.0'}); raw=urllib.request.urlopen(req,timeout=60).read(); im=Image.open(io.BytesIO(raw)).convert('RGB'); o=io.BytesIO(); im.save(o,'PNG',optimize=True); return o.getvalue(),[im.width,im.height]
results=[]; partial=E/'tuning-live.partial.json'
if partial.exists():
 try:results=json.loads(partial.read_text()).get('results',[])
 except:results=[]
done={(r.get('variant'),r.get('target')) for r in results if r.get('status')=='succeeded'}
for v in VARIANTS:
 for t in TARGETS:
  key=(v['id'],t['id'])
  if key in done:continue
  results=[r for r in results if (r.get('variant'),r.get('target'))!=key]
  src,ref=reference(CACHE/t['file']); start=time.time()
  inp={'prompt':t['prompt'],'image':uri(ref),'prompt_strength':v['prompt_strength'],'width':768,'height':768,'sizing_strategy':'controlnet_1_image','num_outputs':1,'num_inference_steps':35,'guidance_scale':7.5,'scheduler':'K_EULER','seed':t['seed'],'negative_prompt':'text, watermark, blurry, malformed finder patterns','controlnet_1':'illusion','controlnet_1_image':uri(CONTROL),'controlnet_1_conditioning_scale':v['qr_scale'],'controlnet_1_start':0,'controlnet_1_end':1,'apply_watermark':False,'disable_safety_checker':False,'refine':'no_refiner'}
  try:
   p=predict(inp); u=p['output'][-1] if isinstance(p['output'],list) else p['output']; b,dims=output(u); name=f"tune--{v['id']}--{t['id']}.png"; (A/name).write_bytes(b); sec=float((p.get('metrics') or {}).get('predict_time') or 0)
   r={'variant':v['id'],'target':t['id'],'status':'succeeded','prediction_id':p['id'],'source_sha256':h(src),'reference_sha256':h(ref),'qr_control_sha256':h(CONTROL),'prompt_strength':v['prompt_strength'],'qr_scale':v['qr_scale'],'seed':t['seed'],'artifact':f'local-artifacts/{name}','artifact_sha256':h(b),'dimensions':dims,'predict_seconds':sec,'wall_seconds':round(time.time()-start,3),'cost_estimate_usd':round(sec*PRICE,6)}
  except Exception as x:r={'variant':v['id'],'target':t['id'],'status':'failed','error':str(x)[:500],'wall_seconds':round(time.time()-start,3)}
  results.append(r); partial.write_text(json.dumps({'results':results},indent=2)+'\n'); print(v['id'],t['id'],r['status'],r.get('predict_seconds'),flush=True)
final={'schema_version':'dual-conditioned-q5-tuning.v1','model':MODEL,'version':VERSION,'payload':PAYLOAD,'price_per_predict_second_usd':PRICE,'results':results}; (E/'tuning-live.json').write_text(json.dumps(final,indent=2)+'\n'); print(json.dumps({'predictions':len(results),'succeeded':sum(x.get('status')=='succeeded' for x in results),'estimated_cost_usd':round(sum(x.get('cost_estimate_usd',0) for x in results),6)},indent=2))
