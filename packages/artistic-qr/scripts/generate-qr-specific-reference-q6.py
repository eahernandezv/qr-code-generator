#!/usr/bin/env python3
"""Q6 live hosted accelerator screen with resumable paid-call evidence."""
from __future__ import annotations
import base64, hashlib, io, json, os, time, urllib.error, urllib.request
from pathlib import Path
from PIL import Image
import qrcode

ROOT=Path(__file__).resolve().parents[3]
EVIDENCE=ROOT/"docs/program/evidence/level2-qr-specific-reference-q6"
ARTIFACTS=EVIDENCE/"local-artifacts"; ARTIFACTS.mkdir(parents=True,exist_ok=True)
PARTIAL=EVIDENCE/"live-screen.partial.json"
PAYLOAD="https://placeholder-online.com/r/q6Specific8"
CACHE=Path("/home/hermes/.hermes/cache/images")
MODELS={
 "qr-controlnet-plus-reference-canny":{
  "name":"anotherjesse/multi-control","version":"76d8414a702e66c84fe2e6e9c8cbdc12e53f950f255aae9ffa5caa7873b12de0","price_per_second":0.0014,
 },
 "reference-ipadapter-plus-qr-canny":{
  "name":"chigozienri/ip_adapter-sdxl-controlnet-canny","version":"6a095e6e0feec0f857752e809946fc0e995a0f126c8bbcfdc5d0e715fbb1989e","price_per_second":0.000975,
 },
}
TARGETS=[
 {"id":"gradient-m-ribbon","file":"img_1e0fb190b4b2.jpg","seed":6103,"prompt":"premium minimal abstract capital M made from crossing rounded ribbons, cyan blue violet gradient, centered emblem, preserve the supplied emblem identity and silhouette, integrated modular artwork, no words"},
 {"id":"wolf-black-white","file":"img_69cef2893b9c.jpg","seed":6106,"prompt":"high contrast black and white front-facing wolf face illustration with luminous eyes, centered, preserve the supplied face identity and silhouette, integrated modular artwork, no words"},
]
BATCHES=[0,1]
# The hosted anotherjesse build is retained as schema evidence but disabled after
# four live calls reproduced its canny_preprocess signature failure.
DISABLED_ARCHITECTURES={"qr-controlnet-plus-reference-canny"}

def token():
 v=os.environ.get("REPLICATE_API_TOKEN","").strip()
 if not v: raise RuntimeError("REPLICATE_API_TOKEN is required")
 return v

def sha256(b:bytes): return hashlib.sha256(b).hexdigest()
def data_url(b:bytes): return "data:image/png;base64,"+base64.b64encode(b).decode()
def api(method,path,payload=None,timeout=60):
 body=json.dumps(payload).encode() if payload is not None else None
 req=urllib.request.Request("https://api.replicate.com/v1"+path,data=body,method=method,headers={"Authorization":"Token "+token(),"Content-Type":"application/json","User-Agent":"curl/8.5.0 HermesQR-Q6"})
 try:
  with urllib.request.urlopen(req,timeout=timeout) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  text=e.read(1200).decode("utf-8","replace");raise RuntimeError(f"Replicate HTTP {e.code}: {text[:600]}") from e

def predict(version,inputs):
 created=None
 for attempt in range(5):
  try: created=api("POST","/predictions",{"version":version,"input":inputs});break
  except RuntimeError as e:
   if "HTTP 429" not in str(e) or attempt==4:raise
   time.sleep(5+attempt*3)
 if not created:raise RuntimeError("creation returned no prediction")
 pid=created["id"]
 for _ in range(200):
  time.sleep(3); cur=api("GET",f"/predictions/{pid}",timeout=30)
  if cur["status"] in ("succeeded","failed","canceled"):
   if cur["status"]!="succeeded":raise RuntimeError(f"Prediction {pid} ended {cur['status']}: {str(cur.get('error'))[:400]}")
   return cur
 try: api("POST",f"/predictions/{pid}/cancel",timeout=10)
 finally: raise RuntimeError(f"Prediction {pid} timed out")

def square_png(path:Path,size=512):
 source=path.read_bytes(); im=Image.open(io.BytesIO(source)).convert("RGB"); im.thumbnail((size-32,size-32),Image.Resampling.LANCZOS)
 canvas=Image.new("RGB",(size,size),"white"); canvas.paste(im,((size-im.width)//2,(size-im.height)//2))
 out=io.BytesIO();canvas.save(out,"PNG",optimize=True);return source,out.getvalue(),[im.width,im.height]
def qr_png(size=512):
 qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,box_size=16,border=4);qr.add_data(PAYLOAD);qr.make(fit=True)
 im=qr.make_image(fill_color="black",back_color="white").convert("RGB").resize((size,size),Image.Resampling.NEAREST)
 out=io.BytesIO();im.save(out,"PNG",optimize=True);return out.getvalue()
def download(url):
 req=urllib.request.Request(url,headers={"User-Agent":"curl/8.5.0 HermesQR-Q6"})
 with urllib.request.urlopen(req,timeout=90) as r: raw=r.read(20*1024*1024)
 im=Image.open(io.BytesIO(raw)).convert("RGB");out=io.BytesIO();im.save(out,"PNG",optimize=True);return out.getvalue(),[im.width,im.height]
def write_state(records):
 PARTIAL.write_text(json.dumps({"schema_version":"qr-specific-reference-q6-live.v1","payload":PAYLOAD,"models":MODELS,"records":records},indent=2)+"\n")

qr=qr_png();(EVIDENCE/"qr-control.png").write_bytes(qr)
records=[]
if PARTIAL.exists():
 try: records=json.loads(PARTIAL.read_text()).get("records",[])
 except Exception: records=[]
done={(r.get("architecture"),r.get("target"),r.get("batch")) for r in records if r.get("status")=="succeeded" and len(r.get("artifacts",[]))==4}
for architecture,model in MODELS.items():
 if architecture in DISABLED_ARCHITECTURES: continue
 for target in TARGETS:
  source,reference,reference_dims=square_png(CACHE/target["file"])
  for batch in BATCHES:
   key=(architecture,target["id"],batch)
   if key in done:continue
   records=[r for r in records if (r.get("architecture"),r.get("target"),r.get("batch"))!=key]
   seed=target["seed"]+batch*100
   if architecture=="qr-controlnet-plus-reference-canny":
    qr_scale=[1.15,1.45][batch]; ref_scale=[0.55,0.38][batch]
    inputs={"prompt":target["prompt"],"negative_prompt":"text, letters, watermark, malformed QR, blurry, low quality","qr_image":data_url(qr),"canny_image":data_url(reference),"qr_conditioning_scale":qr_scale,"canny_conditioning_scale":ref_scale,"guidance_scale":7.5,"num_inference_steps":30,"image_resolution":512,"num_outputs":4,"seed":seed,"disable_safety_check":False}
    public_inputs={"qr_conditioning_scale":qr_scale,"reference_canny_conditioning_scale":ref_scale,"guidance_scale":7.5,"num_inference_steps":30,"num_outputs":4}
   else:
    ref_scale=[0.72,0.9][batch]; qr_scale=[0.8,1.0][batch]
    inputs={"image":data_url(reference),"controlnet_input":data_url(qr),"scale":ref_scale,"controlnet_conditioning_scale":qr_scale,"prompt":target["prompt"],"negative_prompt":"text, letters, watermark, malformed QR, blurry, low quality","num_inference_steps":30,"num_outputs":4,"seed":seed}
    public_inputs={"ip_adapter_scale":ref_scale,"qr_canny_conditioning_scale":qr_scale,"num_inference_steps":30,"num_outputs":4}
   started=time.time()
   try:
    pred=predict(model["version"],inputs); outs=pred.get("output") or []; outs=outs if isinstance(outs,list) else [outs]
    artifacts=[]
    for idx,url in enumerate(outs):
     png,dims=download(url);name=f"{architecture}--{target['id']}--b{batch}-o{idx}.png";(ARTIFACTS/name).write_bytes(png)
     artifacts.append({"artifact":f"local-artifacts/{name}","sha256":sha256(png),"dimensions":dims,"bytes":len(png)})
    if len(artifacts)!=4:raise RuntimeError(f"Expected 4 outputs, received {len(artifacts)}")
    metrics=pred.get("metrics") or {};secs=float(metrics.get("predict_time") or 0)
    rec={"architecture":architecture,"target":target["id"],"batch":batch,"status":"succeeded","prediction_id":pred["id"],"model":model["name"],"version":model["version"],"seed":seed,"source_sha256":sha256(source),"reference_preprocessed_sha256":sha256(reference),"reference_dimensions":reference_dims,"qr_control_sha256":sha256(qr),"sanitized_prompt":target["prompt"],"inputs":public_inputs,"predict_seconds":secs,"wall_seconds":round(time.time()-started,3),"price_per_predict_second_usd":model["price_per_second"],"cost_estimate_usd":round(secs*model["price_per_second"],6),"artifacts":artifacts}
   except Exception as e:
    rec={"architecture":architecture,"target":target["id"],"batch":batch,"status":"failed","model":model["name"],"version":model["version"],"seed":seed,"source_sha256":sha256(source),"error":str(e)[:700],"wall_seconds":round(time.time()-started,3),"artifacts":[]}
   records.append(rec);write_state(records);print(architecture,target["id"],batch,rec["status"],len(rec["artifacts"]),rec.get("cost_estimate_usd"),flush=True)
   time.sleep(11)
final={"schema_version":"qr-specific-reference-q6-live.v1","payload":PAYLOAD,"models":MODELS,"price_source":"Replicate model pages live read-back; estimates use provider predict_time multiplied by published hardware-second price","records":records}
(EVIDENCE/"live-screen.json").write_text(json.dumps(final,indent=2)+"\n")
print(json.dumps({"predictions":len(records),"succeeded":sum(r.get('status')=='succeeded' for r in records),"images":sum(len(r.get('artifacts',[])) for r in records),"estimated_cost_usd":round(sum(r.get('cost_estimate_usd',0) for r in records),6)},indent=2))
