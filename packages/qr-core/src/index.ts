/**
 * QR Core — Matrix generation, functional masks, deterministic rendering
 * Owned by WS-03 (qr-creator)
 */

export { normalizePayload, generateMatrix, renderDeterministic, decodeMatrix } from './api/index.js';
export type {
  QrPayload,
  NormalizedPayload,
  QrMatrix,
  RenderOptions,
  RenderedArtifact,
  ScanTestResult,
  FunctionalRegions,
  FinderPattern,
  TimingPattern,
} from './types.js';
