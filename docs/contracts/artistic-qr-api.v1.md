# artistic-qr-api.v1

## Version
`1.0.0-frozen`

## Owner
Agent 3 — Artistic QR Engineer

## Scope
Apply artistic styles to a QR matrix and render export-ready images.

## Endpoints

### POST /v1/artistic/render
Render an artistic QR from a raw matrix.

**Request:**
```json
{
  "matrix": [[1,0,1], ...],
  "style": "watercolor",
  "palette": ["#FF5733", "#33FF57", "#3357FF"],
  "resolution": 1000
}
```

**Response:**
```json
{
  "job_id": "art-abc123",
  "status": "queued"
}
```

### GET /v1/artistic/status/{job_id}
Poll render job status.

**Response:**
```json
{
  "job_id": "art-abc123",
  "status": "completed",
  "download_url": "/v1/artistic/download/art-abc123.png",
  "expires_at": "2026-07-26T00:00:00Z"
}
```

## Error Taxonomy
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `ART_STYLE_UNKNOWN` | 400 | Requested style not in allowed list |
| `ART_RENDER_FAILED` | 500 | Render engine internal error |
| `ART_JOB_EXPIRED` | 410 | Download URL expired |

## Allowed Styles (MVP)
- `watercolor`
- `geometric`
- `minimalist`

## Constraints
- Max resolution: 3000x3000
- Max palette size: 5 colors
- Must not modify finder patterns or format info modules
