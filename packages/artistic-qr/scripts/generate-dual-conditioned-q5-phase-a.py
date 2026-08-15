#!/usr/bin/env python3
"""Q5 Phase A: live dual-conditioned architecture screen on Replicate."""
from __future__ import annotations
import base64, hashlib, io, json, os, time, urllib.error, urllib.request
from pathlib import Path
from PIL import Image, ImageOps
import qrcode

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / "docs/program/evidence/level2-dual-conditioned-provider-q5"
ARTIFACTS = EVIDENCE / "local-artifacts"
PARTIAL = EVIDENCE / "phase-a-live.partial.json"
MODEL = "fofr/sdxl-multi-controlnet-lora"
VERSION = "89eb212b3d1366a83e949c12a4b45dfe6b6b313b594cb8268e864931ac9ffb16"
PRICE_PER_PREDICT_SECOND = 0.000975
PAYLOAD = "https://placeholder-online.com/r/q5Dual8"
CACHE = Path("/home/hermes/.hermes/cache/images")
ARTIFACTS.mkdir(parents=True, exist_ok=True)

TARGETS = [
    {"id":"gradient-m-ribbon","file":"img_1e0fb190b4b2.jpg","seed":5103,"prompt":"premium minimal abstract capital M made from crossing rounded ribbons, cyan blue violet gradient, centered, preserve the supplied emblem geometry, integrated square modular artwork, no additional words"},
    {"id":"wolf-black-white","file":"img_69cef2893b9c.jpg","seed":5106,"prompt":"high contrast black and white front-facing wolf face illustration with luminous eyes, preserve the supplied face identity and silhouette, integrated square modular artwork, no words"},
]
ARCHITECTURES = [
    {"id":"sdxl-img2img-illusion","reference_control":None},
    {"id":"sdxl-img2img-illusion-canny","reference_control":"edge_canny"},
    {"id":"sdxl-img2img-illusion-lineart","reference_control":"lineart"},
]

def token():
    value=os.environ.get("REPLICATE_API_TOKEN","").strip()
    if not value: raise RuntimeError("REPLICATE_API_TOKEN is required")
    return value

def data_url(data:bytes,mime="image/png"): return f"data:{mime};base64,{base64.b64encode(data).decode()}"
def sha256(data:bytes): return hashlib.sha256(data).hexdigest()
def request(method,path,payload=None,timeout=60):
    body=json.dumps(payload).encode() if payload is not None else None
    req=urllib.request.Request("https://api.replicate.com/v1"+path,data=body,method=method,headers={"Authorization":"Token "+token(),"Content-Type":"application/json","User-Agent":"curl/8.5.0"})
    try:
        with urllib.request.urlopen(req,timeout=timeout) as resp: return json.load(resp)
    except urllib.error.HTTPError as exc:
        text=exc.read(1000).decode("utf-8","replace")
        raise RuntimeError(f"Replicate HTTP {exc.code}: {text[:400]}") from exc

def square_reference(path:Path):
    source=path.read_bytes(); image=Image.open(io.BytesIO(source)).convert("RGB")
    image.thumbnail((704,704),Image.Resampling.LANCZOS)
    canvas=Image.new("RGB",(768,768),"white")
    canvas.paste(image,((768-image.width)//2,(768-image.height)//2))
    out=io.BytesIO(); canvas.save(out,"PNG",optimize=True)
    return source,out.getvalue(),[image.width,image.height]

def qr_control():
    qr=qrcode.QRCode(version=None,error_correction=qrcode.constants.ERROR_CORRECT_H,box_size=16,border=4)
    qr.add_data(PAYLOAD); qr.make(fit=True)
    image=qr.make_image(fill_color="black",back_color="white").convert("RGB").resize((768,768),Image.Resampling.NEAREST)
    out=io.BytesIO(); image.save(out,"PNG",optimize=True); return out.getvalue()

def prediction(inputs):
    created = None
    for attempt in range(4):
        try:
            created=request("POST","/predictions",{"version":VERSION,"input":inputs},timeout=60)
            break
        except RuntimeError as exc:
            if "HTTP 429" not in str(exc) or attempt == 3: raise
            time.sleep(4 + attempt * 2)
    if created is None: raise RuntimeError("Prediction creation failed without a response")
    pid=created["id"]
    for _ in range(100):
        time.sleep(3)
        current=request("GET",f"/predictions/{pid}",timeout=30)
        if current["status"] in ("succeeded","failed","canceled"):
            if current["status"]!="succeeded": raise RuntimeError(f"Prediction {pid} ended {current['status']}: {str(current.get('error'))[:300]}")
            return current
    try: request("POST",f"/predictions/{pid}/cancel",timeout=10)
    finally: raise RuntimeError(f"Prediction {pid} timed out")

def download_output(url):
    req=urllib.request.Request(url,headers={"User-Agent":"curl/8.5.0"})
    with urllib.request.urlopen(req,timeout=60) as resp: raw=resp.read(16*1024*1024)
    image=Image.open(io.BytesIO(raw)).convert("RGB")
    out=io.BytesIO(); image.save(out,"PNG",optimize=True); return out.getvalue(),[image.width,image.height]

def save_state(results):
    PARTIAL.write_text(json.dumps({"schema_version":"dual-conditioned-q5-phase-a.v1","model":MODEL,"version":VERSION,"payload":PAYLOAD,"price_per_predict_second_usd":PRICE_PER_PREDICT_SECOND,"results":results},indent=2)+"\n")

control_bytes=qr_control(); (EVIDENCE/"qr-control.png").write_bytes(control_bytes)
results=[]
if PARTIAL.exists():
    try: results=json.loads(PARTIAL.read_text()).get("results",[])
    except Exception: results=[]
completed={(r.get("architecture"),r.get("target")) for r in results if r.get("status")=="succeeded"}
for arch in ARCHITECTURES:
    for target in TARGETS:
        key=(arch["id"],target["id"])
        if key in completed: continue
        results=[r for r in results if (r.get("architecture"),r.get("target")) != key]
        source_path=CACHE/target["file"]
        source,reference,reference_dims=square_reference(source_path)
        inputs={
            "prompt":target["prompt"],"image":data_url(reference),"prompt_strength":0.48,
            "width":768,"height":768,"sizing_strategy":"controlnet_1_image","num_outputs":1,
            "num_inference_steps":30,"guidance_scale":7.5,"scheduler":"K_EULER","seed":target["seed"],
            "negative_prompt":"text, letters, watermark, blurry, low quality, malformed QR finder patterns",
            "controlnet_1":"illusion","controlnet_1_image":data_url(control_bytes),
            "controlnet_1_conditioning_scale":1.15,"controlnet_1_start":0,"controlnet_1_end":1,
            "apply_watermark":False,"disable_safety_checker":False,"refine":"no_refiner",
        }
        if arch["reference_control"]:
            inputs.update({"controlnet_2":arch["reference_control"],"controlnet_2_image":data_url(reference),"controlnet_2_conditioning_scale":0.45,"controlnet_2_start":0,"controlnet_2_end":0.85})
        started=time.time()
        try:
            pred=prediction(inputs); output=pred["output"][-1] if isinstance(pred["output"],list) else pred["output"]
            png,dims=download_output(output); name=f"phase-a--{arch['id']}--{target['id']}.png"; (ARTIFACTS/name).write_bytes(png)
            metrics=pred.get("metrics") or {}; predict_seconds=float(metrics.get("predict_time") or 0)
            record={"architecture":arch["id"],"target":target["id"],"status":"succeeded","prediction_id":pred["id"],"model":MODEL,"version":VERSION,
                "source_sha256":sha256(source),"reference_preprocessed_sha256":sha256(reference),"reference_dimensions":reference_dims,"qr_control_sha256":sha256(control_bytes),
                "seed":target["seed"],"sanitized_prompt":target["prompt"],"inputs":{"prompt_strength":0.48,"qr_control":"illusion","qr_scale":1.15,"reference_control":arch["reference_control"],"reference_control_scale":0.45 if arch["reference_control"] else None},
                "artifact":f"local-artifacts/{name}","artifact_sha256":sha256(png),"artifact_dimensions":dims,"predict_seconds":predict_seconds,"wall_seconds":round(time.time()-started,3),"cost_estimate_usd":round(predict_seconds*PRICE_PER_PREDICT_SECOND,6)}
        except Exception as exc:
            record={"architecture":arch["id"],"target":target["id"],"status":"failed","source_sha256":sha256(source),"error":str(exc)[:500],"wall_seconds":round(time.time()-started,3)}
        results.append(record); save_state(results); print(arch["id"],target["id"],record["status"],record.get("predict_seconds"),record.get("cost_estimate_usd"),flush=True)
final={"schema_version":"dual-conditioned-q5-phase-a.v1","model":MODEL,"version":VERSION,"payload":PAYLOAD,"price_source":"Replicate model page live read-back: $0.000975 per prediction second","price_per_predict_second_usd":PRICE_PER_PREDICT_SECOND,"results":results}
(EVIDENCE/"phase-a-live.json").write_text(json.dumps(final,indent=2)+"\n")
print(json.dumps({"predictions":len(results),"succeeded":sum(r.get('status')=='succeeded' for r in results),"estimated_cost_usd":round(sum(r.get('cost_estimate_usd',0) for r in results),6)},indent=2))
