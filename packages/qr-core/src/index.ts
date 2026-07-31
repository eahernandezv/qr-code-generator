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
  PalettePattern,
} from './types.js';
export { resolveModuleColor, isFunctionalModule } from './patterned-palette.js';
