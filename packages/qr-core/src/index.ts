/**
 * QR Core — Matrix generation, functional masks, deterministic rendering
 * Owned by WS-03 (qr-creator)
 */

export { normalizePayload, generateMatrix, renderDeterministic, decodeMatrix } from './api/index.js';
export type {
  QrPayload,
  NormalizedPayload,
  ErrorCorrectionLevel,
  QrMatrix,
  RenderOptions,
  RenderedArtifact,
  ScanTestResult,
  FunctionalRegions,
  FinderPattern,
  TimingPattern,
  AlignmentPattern,
  PalettePattern,
  ModuleShape,
  EyeShape,
  EyeFrameShape,
  EyeBallShape,
  FinderShape,
} from './types.js';
export { alignmentPatternCenters, getFunctionalRegions, isProtectedFunctionalModule } from './functional-regions.js';
export { resolveModuleColor, isFunctionalModule } from './patterned-palette.js';
