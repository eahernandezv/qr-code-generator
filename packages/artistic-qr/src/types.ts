/**
 * Artistic QR Types — matching artistic-qr-api.v1.json contract
 */

export type RepairStrategy =
  | 'contrast_boost'
  | 'quiet_zone_enforce'
  | 'module_reinforce'
  | 'error_correction_upgrade'
  | 'composite_rerender';

export interface ArtDirection {
  id: string;
  name: string;
  style:
    | 'editorial-illustration'
    | 'organic-botanical'
    | 'architectural-geometric'
    | 'photographic-cinematic'
    | 'premium-minimal'
    | 'playful-character';
  description: string;
  isGenerative?: boolean;
  deterministicTemplate?: {
    templateId: string;
    requiresVector?: boolean;
  };
}

export interface ReferenceImage {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  hash: string;
}

export interface Palette {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
}

export type PaletteFamily = 'rainbow' | 'pride' | 'trans' | 'bi' | 'berry' | 'forest';
export type PalettePattern =
  | 'solid'
  | 'horizontalGradient'
  | 'verticalGradient'
  | 'diagonalGradient'
  | 'flagRows'
  | 'spiral'
  | 'radialRings';
export type ColorIntensity = 'mellow' | 'balanced' | 'punchy';

export interface Composition {
  focalArea?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'balanced';
  qrProminence?: number;
}

export interface GenerationRequest {
  normalizedPayload: unknown; // NormalizedPayload from @qr/qr-core
  mode: 'deterministic_template' | 'provider_generative';
  artDirectionId?: string;
  prompt?: string;
  referenceImage?: ReferenceImage;
  artisticStrength?: number;
  palette?: Palette;
  paletteFamily?: PaletteFamily;
  palettePattern?: PalettePattern;
  colorIntensity?: ColorIntensity;
  composition?: Composition;
  seed?: number;
}

export interface ScanValidationResult {
  pass: boolean;
  decoder: string;
  version: string;
  thresholdVersion: string;
  scannedPayload: string;
  tests: Array<{
    name: string;
    pass: boolean;
    scale: number;
    perturbation?: 'none' | 'blur' | 'noise' | 'contrast' | 'rotation' | 'perspective';
    details?: Record<string, unknown>;
  }>;
  overallConfidence: 'high' | 'medium' | 'low' | 'failed';
}

export interface Candidate {
  candidateId: string;
  matrixRef: string;
  rendered: {
    format: 'svg' | 'png-dataurl';
    data: string;
    width: number;
    height: number;
  };
  scanResults: ScanValidationResult[];
  exportAllowed: boolean;
  artisticScore: number;
  provenance?: {
    generationMode: string;
    provider?: string;
    modelVersion?: string;
    adapterVersion: string;
    validationVersion: string;
    createdAt: string;
  };
}

export interface GenerationFailure {
  code: string;
  message: string;
  retryable: boolean;
  safeFallbackAvailable: boolean;
}

export interface GenerationBoard {
  boardId: string;
  request: GenerationRequest;
  candidates: Candidate[];
  status: 'pending' | 'generating' | 'validating' | 'completed' | 'failed' | 'cancelled';
  failure?: GenerationFailure;
}

export interface ExportRequest {
  candidateId: string;
  formats: ('png' | 'svg')[];
  sizes?: Array<{
    label: string;
    widthPx: number;
    heightPx: number;
    dpi?: number;
  }>;
}

export interface ExportArtifact {
  artifactId: string;
  candidateId: string;
  files: Array<{
    format: 'png' | 'svg';
    data: string;
    width: number;
    height: number;
  }>;
  provenance: {
    generationMode: string;
    provider?: string;
    modelVersion?: string;
    adapterVersion: string;
    validationVersion: string;
  };
}
