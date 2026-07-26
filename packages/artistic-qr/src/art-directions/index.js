/**
 * @qr/artistic-qr — Art Direction Specifications
 * 
 * Owned by WS-03 (QR Core / Artistic Studio).
 * Frozen against contracts/schemas/artistic-qr-api.v1.json
 * 
 * Six launch-quality art directions with detailed visual structure,
 * composition rules, prompt guidance, and reference image behavior.
 * Each direction is a distinct visual family, not a color preset.
 */

// ---------------------------------------------------------------------------
// Shared composition constraints — every direction must respect these
// ---------------------------------------------------------------------------

export const protectedConstraints = {
  finderPatterns: {
    description: 'Top-left, top-right, bottom-left finder patterns must remain detectable.',
    minContrastRatio: 3.0,
    quietZoneMinPx: 4,
    cornerIntegrity: 'must_preserve_shape',
  },
  timingPatterns: {
    description: 'Horizontal and vertical timing patterns must not be fully obscured.',
    maxCoveragePercent: 40,
  },
  quietZone: {
    description: 'Minimum quiet zone around the QR in all art directions.',
    minModuleWidth: 4,
    colorRequirement: 'must_contrast_with_module',
  },
  errorCorrection: {
    description: 'Artistic intervention budget relative to QR error correction level.',
    maxDamagePercent: {
      L: 7,
      M: 15,
      Q: 25,
      H: 30,
    },
  },
};

// ---------------------------------------------------------------------------
// Minimal — editorial illustration direction
// ---------------------------------------------------------------------------

export const minimal = {
  id: 'minimal',
  name: 'Minimal',
  artDirection: 'minimal',
  description: 'Ultra-clean QR with subtle texture or tone-on-tone refinement. No ornament, only proportion and spacing.',
  mood: ['editorial', 'premium', 'brand-led'],
  generationMode: 'deterministic_template',
  
  visualStructure: {
    composition: 'center_dominant',
    moduleStyle: 'solid_square',
    finderStyle: 'solid_square_with_inner_white',
    background: 'flat_or_near_flat',
    texture: 'none_or_micro_noise',
    frame: 'optional_thin_line',
  },

  paletteRules: {
    allowedTypes: ['monochrome', 'duotone'],
    maxColors: 2,
    contrastRequirement: 'AAA',
    defaultPaletteId: 'minimal-default',
  },

  compositionRules: {
    focalAreaDefault: 'qr_dominant',
    artisticStrengthRange: [0.0, 0.25],
    qrProminenceRange: [0.75, 1.0],
    quietZoneBehavior: 'strict_minimum',
    moduleIntegrity: 'must_not_blend',
  },

  promptGuidance: {
    description: 'Minimal directions work best with neutral, precise language.',
    positiveExamples: [
      'Clean white QR on matte black with 1px hairline border',
      'Warm gray modules on off-white with subtle paper texture',
    ],
    negativeExamples: [
      'Rainbow gradient over the QR',
      'Floral vines weaving through modules',
    ],
    referenceImageBehavior: 'ignored', // minimal is deterministic; reference images are not used
  },

  scanBehavior: {
    expectedConfidence: 'threshold_met',
    typicalRepairNeeded: false,
    fallbackStrategy: 'none_needed',
  },
};

// ---------------------------------------------------------------------------
// Gradient Mesh — fluid color fields
// ---------------------------------------------------------------------------

export const gradientMesh = {
  id: 'gradient_mesh',
  name: 'Gradient Mesh',
  artDirection: 'gradient_mesh',
  description: 'Continuous soft gradients that weave through and around the QR structure without breaking module legibility.',
  mood: ['modern', 'calm', 'digital-native'],
  generationMode: 'deterministic_template',

  visualStructure: {
    composition: 'center_weighted',
    moduleStyle: 'solid_square',
    finderStyle: 'solid_square_with_inner_white',
    background: 'continuous_gradient',
    texture: 'smooth',
    frame: 'none',
  },

  paletteRules: {
    allowedTypes: ['gradient', 'mesh'],
    maxColors: 4,
    contrastRequirement: 'AA',
    defaultPaletteId: 'gradient-mesh-cool',
    gradientDirection: 'diagonal_or_radial',
    moduleGradientOverlap: 'must_maintain_edge',
  },

  compositionRules: {
    focalAreaDefault: 'center',
    artisticStrengthRange: [0.25, 0.6],
    qrProminenceRange: [0.5, 0.85],
    quietZoneBehavior: 'gradient_may_extend_into_quiet_zone_if_contrast_preserved',
    moduleIntegrity: 'edge_contrast_must_exceed_3.0',
  },

  promptGuidance: {
    description: 'Describe color flow and emotional temperature, not specific objects.',
    positiveExamples: [
      'Cool blue-to-violet diagonal gradient behind a sharp black QR',
      'Soft sunrise orange wash with deep navy modules',
    ],
    negativeExamples: [
      'A photo of a dog with QR on top',
      'Explosion of colors covering the whole code',
    ],
    referenceImageBehavior: 'optional_color_mood_inspiration', // may extract palette, not composition
  },

  scanBehavior: {
    expectedConfidence: 'high',
    typicalRepairNeeded: false,
    fallbackStrategy: 'contrast_boost_if_needed',
  },
};

// ---------------------------------------------------------------------------
// Organic Flora — organic/botanical integration
// ---------------------------------------------------------------------------

export const organicFlora = {
  id: 'organic_flora',
  name: 'Organic Flora',
  artDirection: 'organic_flora',
  description: 'Botanical and leaf-like forms that grow around and through the QR pattern, integrating natural shapes with functional geometry.',
  mood: ['warm', 'handmade', 'sustainable'],
  generationMode: 'provider_generative',

  visualStructure: {
    composition: 'asymmetric_with_vines',
    moduleStyle: 'organic_rounded_or_leaftip',
    finderStyle: 'flower_or_seed_pod_motif',
    background: 'natural_texture_or_soft_gradient',
    texture: 'botanical_grain_or_watercolor_bleed',
    frame: 'branching_vine_frame_optional',
  },

  paletteRules: {
    allowedTypes: ['natural', 'earth', 'botanical'],
    maxColors: 6,
    contrastRequirement: 'AA',
    defaultPaletteId: 'organic-flora-forest',
    leafOverlapRules: 'leaves_may_cover_non_timing_modules_if_error_correction_budget_allows',
  },

  compositionRules: {
    focalAreaDefault: 'balanced',
    artisticStrengthRange: [0.4, 1.0],
    qrProminenceRange: [0.2, 0.7],
    quietZoneBehavior: 'vines_may_extend_into_quiet_zone_if_finder_zone_preserved',
    moduleIntegrity: 'finder_corners_must_remain_exposed; timing_pattern_at_least_60_percent_visible',
  },

  promptGuidance: {
    description: 'Describe plant types, growth direction, and season. Be specific about preserving geometric regions.',
    positiveExamples: [
      'Monstera leaves growing around the corners of a QR code, dark green on cream paper',
      'Cherry blossom branches framing a QR code, soft pink petals, spring light',
    ],
    negativeExamples: [
      'A QR code buried in a pile of leaves where no pattern is visible',
      'Abstract splatter paint without botanical reference',
    ],
    referenceImageBehavior: 'strongly_recommended', // reference images guide palette and leaf shape
  },

  scanBehavior: {
    expectedConfidence: 'moderate',
    typicalRepairNeeded: true,
    fallbackStrategy: 'module_reinforce_and_contrast_boost',
  },
};

// ---------------------------------------------------------------------------
// Circuit Board — architectural/geometric scenes
// ---------------------------------------------------------------------------

export const circuitBoard = {
  id: 'circuit_board',
  name: 'Circuit Board',
  artDirection: 'circuit_board',
  description: 'Copper-trace pathways and component motifs that echo the QR module grid, turning the code into a microchip landscape.',
  mood: ['technical', 'precise', 'futuristic'],
  generationMode: 'provider_generative',

  visualStructure: {
    composition: 'grid_aligned',
    moduleStyle: 'via_pad_or_component',
    finderStyle: 'large_ic_or_connector',
    background: 'dark_substrate_with_traces',
    texture: 'pcb_surface_or_silkscreen',
    frame: 'optional_connector_edge',
  },

  paletteRules: {
    allowedTypes: ['technical', 'pcb'],
    maxColors: 4,
    contrastRequirement: 'AA',
    defaultPaletteId: 'circuit-copper',
    traceColorRules: 'traces_may_cross_between_modules_but_not_through_finder_centers',
  },

  compositionRules: {
    focalAreaDefault: 'qr_dominant',
    artisticStrengthRange: [0.3, 0.8],
    qrProminenceRange: [0.4, 0.85],
    quietZoneBehavior: 'traces_may_extend_into_quiet_zone_if_not_dense',
    moduleIntegrity: 'each_module_cell_must_have_some_exposed_area_for_decoder_sampling',
  },

  promptGuidance: {
    description: 'Describe PCB layer, trace style, and component density. Emphasize grid alignment.',
    positiveExamples: [
      'Double-layer PCB with copper traces connecting pads; QR code is the central chip footprint',
      'Dark green FR4 substrate, fine silkscreen labels, golden via pads as module dots',
    ],
    negativeExamples: [
      'A blurry photo of a circuit board with a pasted-on QR sticker',
      'Random scribbled lines with no grid structure',
    ],
    referenceImageBehavior: 'optional_pcb_photo_inspiration',
  },

  scanBehavior: {
    expectedConfidence: 'moderate_to_high',
    typicalRepairNeeded: true,
    fallbackStrategy: 'quiet_zone_restore_and_module_reinforce',
  },
};

// ---------------------------------------------------------------------------
// Watercolor — photographic/cinematic composition
// ---------------------------------------------------------------------------

export const watercolor = {
  id: 'watercolor',
  name: 'Watercolor',
  artDirection: 'watercolor',
  description: 'Transparent pigment bleeds and paper texture that dissolve around finder patterns while preserving enough module edge for scan.',
  mood: ['gentle', 'artistic', 'approachable'],
  generationMode: 'provider_generative',

  visualStructure: {
    composition: 'soft_bleed_centered',
    moduleStyle: 'pigment_pool_or_hard_edge',
    finderStyle: 'reserved_white_or_deep_pigment',
    background: 'paper_texture_with_wash',
    texture: 'paper_grain_and_bleed_edge',
    frame: 'optional_deckled_edge',
  },

  paletteRules: {
    allowedTypes: ['watercolor', 'pastel', 'pigment'],
    maxColors: 5,
    contrastRequirement: 'AA',
    defaultPaletteId: 'watercolor-sunset',
    transparencyRules: 'wash_may_reduce_module_opacity_if_underlying_contrast_remains_above_2.5',
  },

  compositionRules: {
    focalAreaDefault: 'center',
    artisticStrengthRange: [0.3, 0.9],
    qrProminenceRange: [0.3, 0.75],
    quietZoneBehavior: 'wash_may_extend_into_quiet_zone_if_contrast_preserved',
    moduleIntegrity: 'finder_pattern_must_have_pigment_edge_or_reserve; no full bleed into all three finder centers',
  },

  promptGuidance: {
    description: 'Describe pigment type, paper, wetness, and emotional tone. Specify which areas must remain sharp.',
    positiveExamples: [
      'Wet-on-wet watercolor wash in coral and rose, paper grain visible, QR modules painted in deep vermillion with clean edges',
      'Soft morning sky wash in pale blues and golds; QR is rendered in concentrated ultramarine with sharp corners',
    ],
    negativeExamples: [
      'One giant color blob with no structure',
      'QR placed on top of a watercolor painting as a sticker',
    ],
    referenceImageBehavior: 'recommended_for_paper_and_palette',
  },

  scanBehavior: {
    expectedConfidence: 'moderate',
    typicalRepairNeeded: true,
    fallbackStrategy: 'contrast_boost_and_blur_reduce',
  },
};

// ---------------------------------------------------------------------------
// Geometric Tessellation — playful character/object integration
// ---------------------------------------------------------------------------

export const geometricTessellation = {
  id: 'geometric_tessellation',
  name: 'Geometric Tessellation',
  artDirection: 'geometric_tessellation',
  description: 'Bold repeating polygons and interlocking shapes that tessellate across the canvas, framing the QR as a crystalline object.',
  mood: ['bold', 'structured', 'contemporary'],
  generationMode: 'deterministic_template',

  visualStructure: {
    composition: 'tiled_with_qr_as_void_or_anchor',
    moduleStyle: 'solid_square_or_polygon',
    finderStyle: 'hexagon_or_triangle_cluster',
    background: 'repeating_polygon_tiles',
    texture: 'flat_vector',
    frame: 'tessellated_border',
  },

  paletteRules: {
    allowedTypes: ['complementary_pair', 'triad'],
    maxColors: 4,
    contrastRequirement: 'AAA',
    defaultPaletteId: 'geo-prism',
    tileRules: 'tile_colors_must_alternate_to_avoid_zebra_artifacts',
  },

  compositionRules: {
    focalAreaDefault: 'balanced',
    artisticStrengthRange: [0.3, 0.75],
    qrProminenceRange: [0.4, 0.9],
    quietZoneBehavior: 'tessellation_may_continue_into_quiet_zone_if_low_contrast_there',
    moduleIntegrity: 'module_cells_may_be_reinterpreted_as_tiles_if_size_preserved',
  },

  promptGuidance: {
    description: 'Describe tile shape, symmetry group, and color logic. QR can be a negative-space void or a positive anchor.',
    positiveExamples: [
      'Penrose rhombus tiling in navy and gold; QR is a negative-space diamond at the center',
      'Isometric cube tessellation in teal and coral; QR modules are individual cubes viewed top-down',
    ],
    negativeExamples: [
      'Random scattered polygons with no tiling rule',
      'QR rotated 45 degrees inside a square tessellation',
    ],
    referenceImageBehavior: 'optional_for_symmetry_inspiration',
  },

  scanBehavior: {
    expectedConfidence: 'high',
    typicalRepairNeeded: false,
    fallbackStrategy: 'none_or_contrast_boost',
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const artDirections = {
  minimal,
  gradient_mesh: gradientMesh,
  organic_flora: organicFlora,
  circuit_board: circuitBoard,
  watercolor,
  geometric_tessellation: geometricTessellation,
};

export const artDirectionList = Object.values(artDirections);

export function getArtDirection(id) {
  return artDirections[id] || null;
}

export function validateArtDirection(id) {
  return Object.keys(artDirections).includes(id);
}
