# qr-core-api.v1

## Version
`1.0.0-frozen`

## Owner
Agent 1 — QR Core Engineer

## Scope
QR encoding, validation, and basic rendering pipeline.

## Endpoints

### POST /v1/qr/encode
Encode raw data into a QR matrix.

**Request:**
```json
{
  "data": "https://example.com",
  "error_correction": "M",
  "version": null
}
```

**Response:**
```json
{
  "matrix": [[1,0,1], ...],
  "version": 3,
  "error_correction": "M",
  "size": 29
}
```

### POST /v1/qr/validate
Validate a URL string for QR encoding safety.

**Request:**
```json
{"url": "https://example.com/path"}
```

**Response:**
```json
{
  "valid": true,
  "reason": null,
  "normalized": "https://example.com/path"
}
```

## Error Taxonomy
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `QR_ENCODE_TOO_LONG` | 400 | Data exceeds maximum QR capacity |
| `QR_INVALID_URL` | 400 | URL failed safety validation |
| `QR_VERSION_UNSUPPORTED` | 400 | Requested version out of range |
