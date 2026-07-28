/**
 * Feature flags for the Artistic QR Studio.
 * Static build-time configuration — gates functionality when backend services
 * (checkout, generative engine) are unavailable or explicitly disabled.
 *
 * In a future stage these can be hydrated from a remote config endpoint.
 */

/// <reference types="vite/client" />

export interface FeatureFlags {
  /** Enables the paid checkout flow and large/print exports */
  artistic_checkout_enabled: boolean
  /** Enables generative/AI candidate generation (provider_generative mode) */
  artistic_generative_enabled: boolean
  /** Enables refinement and additional rounds beyond the first board */
  artistic_refinement_enabled: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  artistic_checkout_enabled: false,
  artistic_generative_enabled: false,
  artistic_refinement_enabled: false,
}

/**
 * Merge build-time overrides from import.meta.env if present.
 * Vite replaces env vars at build time for static网站优化.
 */
function buildFlags(): FeatureFlags {
  const env = typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string | undefined>) : {}
  return {
    artistic_checkout_enabled:
      env.VITE_ARTISTIC_CHECKOUT_ENABLED === 'true' ||
      env.VITE_ARTISTIC_CHECKOUT_ENABLED === '1' ||
      DEFAULT_FLAGS.artistic_checkout_enabled,
    artistic_generative_enabled:
      env.VITE_ARTISTIC_GENERATIVE_ENABLED === 'true' ||
      env.VITE_ARTISTIC_GENERATIVE_ENABLED === '1' ||
      DEFAULT_FLAGS.artistic_generative_enabled,
    artistic_refinement_enabled:
      env.VITE_ARTISTIC_REFINEMENT_ENABLED === 'true' ||
      env.VITE_ARTISTIC_REFINEMENT_ENABLED === '1' ||
      DEFAULT_FLAGS.artistic_refinement_enabled,
  }
}

export const FEATURE_FLAGS = Object.freeze(buildFlags())

/** Type-safe flag accessor for conditional rendering and logic */
export function isFlagEnabled<K extends keyof FeatureFlags>(flag: K): boolean {
  return FEATURE_FLAGS[flag]
}
