#!/usr/bin/env python3
"""Independent OpenCV exact-payload verification for Core remediation artifacts."""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2


def decode(path: Path) -> str:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise RuntimeError(f"Unable to read {path}")
    value, _points, _straight = cv2.QRCodeDetector().detectAndDecode(image)
    return value


def main() -> int:
    output_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts/core-engine/remediation-d1-d2").resolve()
    jsqr = json.loads((output_dir / "independent-jsqr-evidence.json").read_text())
    canonical = jsqr["canonicalPayload"]
    cases = []
    for item in jsqr["cases"]:
        path = output_dir / item["file"]
        decoded = decode(path)
        exact = decoded == canonical
        cases.append({
            "name": item["name"],
            "file": item["file"],
            "decodedPayload": decoded,
            "exactPayloadMatch": exact,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        })
        if not exact:
            raise RuntimeError(f"{item['name']}: OpenCV exact payload mismatch")

    failed_path = (output_dir / jsqr["preservedFailedProvider"]["file"]).resolve()
    failed_decoded = decode(failed_path)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "opencvVersion": cv2.__version__,
        "canonicalPayload": canonical,
        "cases": cases,
        "preservedFailedProvider": {
            "file": jsqr["preservedFailedProvider"]["file"],
            "decodedPayload": failed_decoded,
            "negativeDecode": failed_decoded == "",
            "exportAllowed": False,
            "exportDenied": jsqr["preservedFailedProvider"]["exportDenied"],
            "sha256": hashlib.sha256(failed_path.read_bytes()).hexdigest(),
        },
    }
    if failed_decoded or not report["preservedFailedProvider"]["exportDenied"]:
        raise RuntimeError("Preserved failed provider artifact did not remain negative/fail-closed")
    (output_dir / "independent-opencv-evidence.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
