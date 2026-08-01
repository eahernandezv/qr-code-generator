/**
 * QR Core Types — matching qr-core-api.v1.json contract
 */

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type QrMode = 'url' | 'text' | 'email' | 'phone' | 'wifi';
export type EyeShape = 'square' | 'circle' | 'rounded' | 'squircle' | 'chamfered' | 'diamond' | 'hex' | 'vertical-capsule' | 'horizontal-capsule';
export type EyeFrameShape = Exclude<EyeShape, 'vertical-capsule' | 'horizontal-capsule'>;
export type EyeBallShape = Exclude<EyeShape, 'diamond'>;
/** Backwards-compatible combined finder option; limited to shapes valid for both parts. */
export type FinderShape = 'square' | 'circle' | 'rounded' | 'squircle' | 'chamfered' | 'hex';
export type ModuleShape = 'square' | 'circle' | 'rounded' | 'vertical-bars' | 'horizontal-bars' | 'notched' | 'shield';
export type RenderFormat = 'svg' | 'png-dataurl' | 'canvas';
export type PalettePattern =
  | 'solid'
  | 'horizontalGradient'
  | 'verticalGradient'
  | 'diagonalGradient'
  | 'flagRows'
  | 'spiral'
  | 'radialRings';

export interface QrPayload {
  mode: QrMode;
  content: string;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  maskPattern?: number;
  version?: number;
}

export interface NormalizedPayload {
  canonical: string;
  mode: QrMode;
  byteLength: number;
  version: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  maskPattern: number;
}

export interface FinderPattern {
  x: number;
  y: number;
  size: number;
}

export interface TimingPattern {
  orientation: 'horizontal' | 'vertical';
  start: number;
  end: number;
}

export interface FunctionalRegions {
  finderPatterns: FinderPattern[];
  separators: Array<{ x: number; y: number; size: number }>;
  timingPatterns: TimingPattern[];
  darkModule: { x: number; y: number };
  formatInfo: Array<{ x: number; y: number; isECI: boolean }>;
  versionInfo: Array<{ x: number; y: number }>;
}

export interface QrMatrix {
  size: number;
  modules: number[][];
  version: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  maskPattern: number;
  functionalRegions: FunctionalRegions;
}

export interface RenderOptions {
  format?: RenderFormat;
  moduleSize?: number;
  margin?: number;
  colorDark?: string;
  colorLight?: string;
  shape?: ModuleShape;
  /** Legacy shorthand: applies the same shape to frame and ball unless either split option is set. */
  eyeShape?: FinderShape;
  eyeFrameShape?: EyeFrameShape;
  eyeBallShape?: EyeBallShape;
  /** Ordered, scan-safe active-module colors. The first color is used for functional modules. */
  modulePalette?: readonly string[];
  palettePattern?: PalettePattern;
  functionalColor?: string;
}

export interface RenderedArtifact {
  format: 'svg' | 'png-dataurl';
  data: string;
  width: number;
  height: number;
  metadata: {
    version: number;
    errorCorrectionLevel: string;
    maskPattern: number;
    moduleSize: number;
    margin: number;
  };
}

export interface ScanTestResult {
  pass: boolean;
  decoder: string;
  version: string;
  scannedPayload: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export class QrCoreError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ? `${code}: ${message}` : code);
    this.name = 'QrCoreError';
    this.code = code;
  }
}
