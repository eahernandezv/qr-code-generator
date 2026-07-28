"""
provider_generative.py
QR Creator — Replicate-backed generative artistic QR pipeline.

Outputs conform to artistic-qr-api.v1.json contract.
"""
from __future__ import annotations

import json
import base64
import os
import time
import uuid
import logging
import signal
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Optional
import urllib.request
import urllib.error

# ─── Configuration ───────────────────────────────────────────────
REPLICATE_API_TOKEN_PATH = os.environ.get("REPLICATE_TOKEN_PATH")
REPLICATE_VAULT_PASSWORD = os.environ.get("REPLICATE_VAULT_PASSWORD")

# Model registry — QR-conditioned diffusion models on Replicate
MODEL_ZYLIM = {
    "owner": "zylim0702",
    "name": "qr_code_controlnet",
    "version": "628e604e13cf63d8ec58bd4d238474e8986b054bc5e1326e50995fdbc851c557",
    "description": "ControlNet QR Code Generator — fast, 20 steps, artistic composition",
    "step_default": 20,
    "cost_estimate_per_img": 0.015,
    "url_param": "url",
    "step_param": "num_inference_steps",
    "conditioning_param": "qr_conditioning_scale",
    "guidance_default": 9,
    "output_param": "num_outputs",
}

MODEL_NATERAW = {
    "owner": "nateraw",
    "name": "qrcode-stable-diffusion",
    "version": "9cdabf8f8a991351960c7ce2105de2909514b40bd27ac202dba57935b07d29d4",
    "description": "Stable Diffusion + QR ControlNet — higher quality, 40 steps, slower",
    "step_default": 40,
    "cost_estimate_per_img": 0.035,
    "url_param": "qr_code_content",
    "step_param": "num_inference_steps",
    "conditioning_param": "controlnet_conditioning_scale",
    "guidance_default": 7.5,
    "output_param": "batch_size",
}

# Primary → fallback order
MODEL_CHAIN = [MODEL_ZYLIM, MODEL_NATERAW]

# Retry configuration
MAX_ATTEMPTS_PER_MODEL = 2
POLL_INTERVAL_S = 3
MAX_POLL_CYCLES = 60  # 3 min per model

# Logging
LOG_DIR = Path(os.environ.get("QR_CREATOR_LOG_DIR", str(Path(__file__).resolve().parent / "logs")))
LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "provider_generative.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("provider_generative")
_ACTIVE_PREDICTION: Optional[tuple[str, str]] = None

# ─── Data structures (contract-matched) ───────────────────────────

@dataclass
class Provenance:
    generationMode: str = "provider_generative"
    provider: str = "replicate"
    modelVersion: str = ""
    adapterVersion: str = "qr-creator-gen-v1"
    validationVersion: str = "scan-v1"
    createdAt: str = field(default_factory=lambda: _iso_now())

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Rendered:
    format: str = "png-dataurl"
    data: str = ""
    width: int = 768
    height: int = 768

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ScanTest:
    name: str
    pass_: bool = field(metadata={"json_key": "pass"})
    scale: float = 1.0
    perturbation: str = "none"
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "pass": self.pass_,
            "scale": self.scale,
            "perturbation": self.perturbation,
            "details": self.details,
        }


@dataclass
class ScanValidationResult:
    pass_: bool = field(metadata={"json_key": "pass"})
    decoder: str
    version: str
    thresholdVersion: str
    scannedPayload: str
    tests: list[ScanTest]
    overallConfidence: str  # high | medium | low | failed

    def to_dict(self) -> dict:
        return {
            "pass": self.pass_,
            "decoder": self.decoder,
            "version": self.version,
            "thresholdVersion": self.thresholdVersion,
            "scannedPayload": self.scannedPayload,
            "tests": [t.to_dict() for t in self.tests],
            "overallConfidence": self.overallConfidence,
        }


@dataclass
class Candidate:
    candidateId: str
    matrixRef: str
    rendered: Rendered
    scanResults: list[ScanValidationResult]
    exportAllowed: bool
    artisticScore: float
    provenance: Optional[Provenance] = None

    def to_dict(self) -> dict:
        return {
            "candidateId": self.candidateId,
            "matrixRef": self.matrixRef,
            "rendered": self.rendered.to_dict(),
            "scanResults": [s.to_dict() for s in self.scanResults],
            "exportAllowed": self.exportAllowed,
            "artisticScore": self.artisticScore,
            "provenance": self.provenance.to_dict() if self.provenance else None,
        }


@dataclass
class GenerationFailure:
    code: str
    message: str
    retryable: bool
    safeFallbackAvailable: bool

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class GenerationBoard:
    boardId: str
    request: dict  # raw GenerationRequest dict
    candidates: list[Candidate]
    status: str  # pending | generating | validating | completed | failed | cancelled
    failure: Optional[GenerationFailure] = None
    totalLatencyMs: float = 0.0
    totalCostEstimate: float = 0.0

    def to_dict(self) -> dict:
        return {
            "boardId": self.boardId,
            "request": self.request,
            "candidates": [c.to_dict() for c in self.candidates],
            "status": self.status,
            "failure": self.failure.to_dict() if self.failure else None,
            "totalLatencyMs": round(self.totalLatencyMs, 2),
            "totalCostEstimate": round(self.totalCostEstimate, 4),
        }


# ─── Helpers ────────────────────────────────────────────────────

def _iso_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _get_vault_token() -> str:
    """Load a token from explicit environment or an explicitly configured encrypted vault."""
    direct = os.environ.get("REPLICATE_API_TOKEN")
    if direct:
        return direct.strip()
    if not REPLICATE_API_TOKEN_PATH:
        raise RuntimeError("Set REPLICATE_API_TOKEN or REPLICATE_TOKEN_PATH")
    if not REPLICATE_VAULT_PASSWORD:
        raise RuntimeError("Set REPLICATE_VAULT_PASSWORD for the encrypted token file")
    enc_path = Path(REPLICATE_API_TOKEN_PATH).expanduser()
    if not enc_path.exists():
        raise FileNotFoundError(f"Vault file not found: {enc_path}")

    import subprocess
    result = subprocess.run(
        [
            "openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-d",
            "-pass", f"pass:{REPLICATE_VAULT_PASSWORD}",
            "-in", str(enc_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Vault decryption failed: {result.stderr[:200]}")

    # Parse TOKEN=value format
    text = result.stdout.strip()
    if "=" in text:
        text = text.split("=", 1)[1].strip()
    return text


def _download_image_data_url(url: str, max_bytes: int = 12 * 1024 * 1024) -> str:
    """Download a bounded provider image and return self-contained PNG/JPEG/WebP data."""
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        content_type = (resp.headers.get_content_type() or "").lower()
        if content_type != "image/png":
            raise RuntimeError(f"Provider must return image/png, got: {content_type}")
        body = resp.read(max_bytes + 1)
        if len(body) > max_bytes:
            raise RuntimeError(f"Provider image exceeds {max_bytes} bytes")
    return f"data:{content_type};base64,{base64.b64encode(body).decode('ascii')}"


def _replicate_api(
    method: str,
    path: str,
    token: str,
    payload: Optional[dict] = None,
    timeout: float = 60,
) -> dict:
    """Make a Replicate API call."""
    url = f"https://api.replicate.com/v1{path}"
    headers = {
        "Authorization": f"Token {token}",
        "Content-Type": "application/json",
        "User-Agent": "curl/8.5.0",
    }

    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if raw:
                return json.loads(raw)
            return {}
    except urllib.error.HTTPError as e:
        body = e.fp.read().decode() if e.fp else ""
        raise ReplicateAPIError(e.code, e.reason, body)


def _cancel_active_prediction() -> None:
    """Best-effort cancellation of the active billable prediction."""
    global _ACTIVE_PREDICTION
    active = _ACTIVE_PREDICTION
    _ACTIVE_PREDICTION = None
    if active:
        prediction_id, token = active
        try:
            _replicate_api("POST", f"/predictions/{prediction_id}/cancel", token, timeout=8)
        except Exception as error:
            logger.warning("Provider cancellation request failed: %s", error)


def _handle_termination(signum, _frame):
    """Cancel the active billable prediction before process exit."""
    _cancel_active_prediction()
    raise SystemExit(128 + signum)


signal.signal(signal.SIGTERM, _handle_termination)


class ReplicateAPIError(Exception):
    def __init__(self, code: int, reason: str, body: str):
        self.code = code
        self.reason = reason
        self.body = body

    def __str__(self):
        return f"Replicate API {self.code} {self.reason}: {self.body[:200]}"


# ─── Core pipeline ──────────────────────────────────────────────

class ReplicateProvider:
    """
    Replicate-backed generative QR provider.
    Supports primary model (zylim0702) with fallback (nateraw).
    """

    def __init__(self, token: Optional[str] = None):
        self.token = token or _get_vault_token()
        self.logger = logger

    def generate_board(
        self,
        generation_request: dict[str, Any],
        num_candidates: int = 4,
        primary_model: Optional[dict] = None,
    ) -> GenerationBoard:
        """
        Generate a board of artistic QR candidates.

        Args:
            generation_request: JSON-matching GenerationRequest dict.
            num_candidates: Number of candidates (default 4 per contract).
            primary_model: Override primary model (for testing or forced fallback).

        Returns:
            GenerationBoard with candidates, all timed and costed.
        """
        t_start = time.time()
        board_id = str(uuid.uuid4())
        board = GenerationBoard(
            boardId=board_id,
            request=generation_request,
            candidates=[],
            status="generating",
        )

        # Extract prompt and URL from request
        payload_url = self._extract_url(generation_request)
        prompt = generation_request.get("prompt", "artistic QR code")
        artistic_strength = generation_request.get("artisticStrength", 0.5)
        seed = generation_request.get("seed")

        # Conditioning scale maps artisticStrength 0-1 to model range
        conditioning_scale = self._map_conditioning_scale(
            artistic_strength, num_candidates
        )

        model_chain = [primary_model] if primary_model else list(MODEL_CHAIN)

        generated = []
        total_cost = 0.0

        for candidate_index in range(num_candidates):
            self.logger.info(
                f"Board {board_id}: generating candidate {candidate_index + 1}/{num_candidates}"
            )
            c_start = time.time()

            candidate = self._generate_candidate(
                board_id=board_id,
                candidate_index=candidate_index,
                url=payload_url,
                prompt=prompt,
                seed=seed,
                conditioning_scale=conditioning_scale[candidate_index % len(conditioning_scale)],
                model_chain=model_chain,
            )

            c_latency = time.time() - c_start
            total_cost += self._estimate_cost(candidate)
            generated.append(candidate)

            self.logger.info(
                f"Candidate {candidate_index + 1} done in {c_latency:.1f}s, "
                f"exportAllowed={candidate.exportAllowed}, "
                f"model={candidate.provenance.modelVersion if candidate.provenance else 'unknown'}"
            )

        board.candidates = generated
        board.status = "completed"
        board.totalLatencyMs = (time.time() - t_start) * 1000
        board.totalCostEstimate = total_cost

        self.logger.info(
            f"Board {board_id} complete: {num_candidates} candidates, "
            f"{board.totalLatencyMs:.0f}ms, est_cost=${board.totalCostEstimate:.4f}"
        )
        return board

    def _extract_url(self, request: dict[str, Any]) -> str:
        """Extract target URL from GenerationRequest."""
        # normalizedPayload may contain canonical URL
        npayload = request.get("normalizedPayload", {})
        if isinstance(npayload, dict):
            url = npayload.get("canonical", "")
            if url:
                return url
        # Fallback: try to decode from any embedded payload data
        prompt = request.get("prompt", "")
        # If prompt contains a URL-like string, extract it
        import re
        urls = re.findall(r'https?://[^\s<>"{}|\\^`\[\]]+', prompt)
        if urls:
            return urls[0]
        return "https://ernestohernandez.com"

    def _map_conditioning_scale(self, strength: float, num_candidates: int) -> list[float]:
        """
        Map artisticStrength [0,1] to conditioning scales.
        Spread across candidates to explore the art/scan tradeoff.
        """
        # zylim range: 0.7-1.5, nateraw range: 0.5-2.0
        # For variety: some lower (more art), some higher (more scan-ability)
        base = 0.7 + strength * 0.8  # 0.7 to 1.5 for zylim
        scales = []
        for i in range(num_candidates):
            delta = (i - num_candidates / 2) * 0.15
            scales.append(
                round(max(0.5, min(2.0, base + delta)), 2)
            )
        return scales

    def _generate_candidate(
        self,
        board_id: str,
        candidate_index: int,
        url: str,
        prompt: str,
        seed: Optional[int],
        conditioning_scale: float,
        model_chain: list[dict],
    ) -> Candidate:
        """
        Generate one candidate, trying model_chain with retry per model.
        """
        candidate_id = str(uuid.uuid4())

        for model in model_chain:
            for attempt in range(1, MAX_ATTEMPTS_PER_MODEL + 1):
                self.logger.info(
                    f"[{candidate_id}] Attempt {attempt}/{MAX_ATTEMPTS_PER_MODEL} "
                    f"with {model['owner']}/{model['name']} "
                    f"(cond_scale={conditioning_scale})"
                )
                try:
                    result = self._run_prediction(
                        model=model,
                        url=url,
                        prompt=prompt,
                        seed=seed,
                        conditioning_scale=conditioning_scale,
                    )
                    return self._build_candidate(
                        candidate_id=candidate_id,
                        board_id=board_id,
                        candidate_index=candidate_index,
                        model=model,
                        result=result,
                        url=url,
                    )

                except ReplicateAPIError as e:
                    _cancel_active_prediction()
                    self.logger.warning(
                        f"[{candidate_id}] Model {model['name']} attempt {attempt} failed: {e}"
                    )
                    if e.code == 429:
                        # Rate limit — wait longer before retry
                        wait = 2 ** attempt
                        self.logger.info(f"Rate limited, sleeping {wait}s")
                        time.sleep(wait)
                    elif e.code == 402:
                        # Payment required — don't retry this model
                        self.logger.error(f"[{candidate_id}] Insufficient credit")
                        break
                    elif e.code >= 500:
                        # Server error — retry
                        time.sleep(1)
                    else:
                        # Client error — possibly invalid input, break
                        break

        # All models exhausted
        self.logger.error(f"[{candidate_id}] All models failed, returning failed candidate")
        return Candidate(
            candidateId=candidate_id,
            matrixRef=f"{board_id}-failed",
            rendered=Rendered(data=""),
            scanResults=[
                ScanValidationResult(
                    pass_=False,
                    decoder="none",
                    version="0.0.0",
                    thresholdVersion="scan-v1",
                    scannedPayload="",
                    tests=[],
                    overallConfidence="failed",
                )
            ],
            exportAllowed=False,
            artisticScore=0.0,
            provenance=Provenance(
                modelVersion="failed",
            ),
        )

    def _run_prediction(
        self,
        model: dict,
        url: str,
        prompt: str,
        seed: Optional[int],
        conditioning_scale: float,
    ) -> dict:
        """Run a single Replicate prediction and wait for completion."""
        # Build input payload
        inputs: dict[str, Any] = {
            model["url_param"]: url,
            "prompt": prompt,
        }
        if seed is not None:
            inputs["seed"] = seed

        # Model-specific parameters
        inputs[model["conditioning_param"]] = conditioning_scale
        if "guidance" in model:
            inputs["guidance_scale"] = model["guidance"]
        else:
            inputs["guidance_scale"] = 9 if "zylim" in model["name"] else 7.5

        inputs[model["step_param"]] = model["step_default"]
        inputs[model["output_param"]] = 1

        # Image resolution for zylim
        if "image_resolution" in model.get("__extra_params", []):
            inputs["image_resolution"] = 768

        # Create prediction
        global _ACTIVE_PREDICTION
        prediction = _replicate_api(
            "POST", "/predictions", self.token,
            payload={"version": model["version"], "input": inputs}
        )
        pred_id = prediction["id"]
        _ACTIVE_PREDICTION = (pred_id, self.token)
        self.logger.info(f"Prediction created: {pred_id}, status={prediction['status']}")

        # Poll for completion
        for i in range(MAX_POLL_CYCLES):
            time.sleep(POLL_INTERVAL_S)
            status = _replicate_api("GET", f"/predictions/{pred_id}", self.token)
            s = status["status"]
            if s in ("succeeded", "failed", "canceled"):
                _ACTIVE_PREDICTION = None
                if s == "succeeded":
                    return status
                else:
                    raise ReplicateAPIError(
                        500, "Prediction failed",
                        status.get("error") or status.get("logs", "")[-500:]
                    )
            self.logger.debug(f"Poll {i+1}/{MAX_POLL_CYCLES}: {s}")

        # Timeout
        # Cancel the stuck prediction
        try:
            _replicate_api("POST", f"/predictions/{pred_id}/cancel", self.token)
        except Exception:
            pass
        _ACTIVE_PREDICTION = None
        raise ReplicateAPIError(504, "Gateway Timeout", "Prediction timed out after polling")

    def _build_candidate(
        self,
        candidate_id: str,
        board_id: str,
        candidate_index: int,
        model: dict,
        result: dict,
        url: str,
    ) -> Candidate:
        """Build a Candidate from a successful Replicate prediction."""
        output = result["output"]
        if isinstance(output, list):
            output = output[0] if output else ""
        if not isinstance(output, str) or not output.startswith("https://"):
            raise RuntimeError("Provider returned no HTTPS image URL")
        rendered_data = _download_image_data_url(output)

        metrics = result.get("metrics", {})
        predict_time = metrics.get("predict_time", 0)

        provenance = Provenance(
            modelVersion=f"{model['owner']}/{model['name']}@{model['version'][:16]}",
        )

        # Scan authorization is intentionally withheld here. The TypeScript Core
        # Engine performs decoder and perturbation validation on these exact bytes.
        scan_result = ScanValidationResult(
            pass_=False,
            decoder="pending-core-validation",
            version=model["version"][:16],
            thresholdVersion="pending-core-validation",
            scannedPayload="",
            tests=[],
            overallConfidence="failed",
        )

        artistic_score = self._compute_artistic_score(candidate_index, model, result)

        return Candidate(
            candidateId=candidate_id,
            matrixRef=f"{board_id}-c{candidate_index}",
            rendered=Rendered(
                format="png-dataurl",
                data=rendered_data,
                width=768,
                height=768,
            ),
            scanResults=[scan_result],
            exportAllowed=False,
            artisticScore=artistic_score,
            provenance=provenance,
        )

    def _compute_artistic_score(
        self, candidate_index: int, model: dict, result: dict
    ) -> float:
        """
        Compute a heuristic artistic score based on model, timing, and diversity.
        """
        base = 0.75
        # zylim tends to produce more integrated art
        if "zylim" in model["name"]:
            base += 0.1
        # Longer predict time often correlates with richer output
        metrics = result.get("metrics", {})
        predict_time = metrics.get("predict_time", 0)
        if predict_time > 10:
            base += 0.05
        # Diversity per candidate
        diversity = [0.0, 0.02, -0.02, 0.01][candidate_index % 4]
        return round(min(1.0, max(0.0, base + diversity)), 3)

    def _estimate_cost(self, candidate: Candidate) -> float:
        """Estimate cost from provenance model info."""
        pv = candidate.provenance
        if not pv:
            return 0.0
        mv = pv.modelVersion
        if "zylim" in mv:
            return MODEL_ZYLIM["cost_estimate_per_img"]
        if "nateraw" in mv:
            return MODEL_NATERAW["cost_estimate_per_img"]
        return 0.0


# ─── CLI JSON bridge ─────────────────────────────────────────────

def main():
    import sys
    import argparse

    parser = argparse.ArgumentParser(description="QR Creator Provider Generative Pipeline")
    parser.add_argument("--pretty", action="store_true", help="Pretty print JSON output")
    parser.add_argument("--token", default=None, help="Replicate API token (overrides vault)")
    parser.add_argument("--model", default=None, choices=["zylim", "nateraw"], help="Force specific model")
    args = parser.parse_args()

    # Read GenerationRequest from stdin
    raw = sys.stdin.read()
    if not raw:
        print(json.dumps({"error": "No input"}), file=sys.stderr)
        sys.exit(1)

    try:
        request = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}), file=sys.stderr)
        sys.exit(1)

    provider = ReplicateProvider(token=args.token)

    model_override = None
    if args.model == "zylim":
        model_override = MODEL_ZYLIM
    elif args.model == "nateraw":
        model_override = MODEL_NATERAW

    try:
        candidate_count = max(1, min(4, int(os.environ.get("QR_CREATOR_CANDIDATE_COUNT", "4"))))
        board = provider.generate_board(
            request,
            num_candidates=candidate_count,
            primary_model=model_override,
        )
        output = board.to_dict()
    except ReplicateAPIError as e:
        error_output = {
            "error": str(e),
            "code": e.code,
            "retryable": e.code in (429, 500, 502, 503, 504),
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        error_output = {
            "error": str(e),
            "code": "INTERNAL_ERROR",
            "retryable": False,
        }
        print(json.dumps(error_output), file=sys.stderr)
        sys.exit(1)

    indent = 2 if args.pretty else None
    print(json.dumps(output, indent=indent))


if __name__ == "__main__":
    main()
