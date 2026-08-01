/** Browser-safe QR Core surface: encoding, matrix generation, and SVG only. */
export { normalizePayload } from './normalize.js';
export { generateMatrix } from './lib/matrix.js';
export { renderSvg as renderDeterministicSvg } from './svg-renderer.js';
export type {
  QrPayload,
  NormalizedPayload,
  QrMatrix,
  RenderOptions,
  RenderedArtifact,
  FunctionalRegions,
  FinderPattern,
  TimingPattern,
  PalettePattern,
  ModuleShape,
  EyeShape,
  FinderShape,
} from './types.js';
export { resolveModuleColor, isFunctionalModule } from './patterned-palette.js';
