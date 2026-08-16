import imageFitSchema from '../../../packages/contracts/schemas/image-fit-qr-api.v1.json'
import imageFitFixture from '../../../packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'

const controlProperties = imageFitSchema.definitions.UserControlsV1.properties
const balancedCandidate = imageFitFixture.candidates[0]
const controlledRuntimeRequest = {
  ...imageFitFixture.request,
  target_image: {
    ...imageFitFixture.request.target_image,
    image_ref: 'docs/program/evidence/q9-quality-loop/inputs/q9-medium-logo-default.png',
    width_px: 192,
    height_px: 144,
    sha256: 'b8e3a76c0937fd7efa18c2e1ee50a07a0ed002824eb26c6e65fce5b304f6b799',
    complexity: 'medium_logo',
  },
} as const

if (!balancedCandidate || imageFitFixture.schema_version !== 'image-fit-qr-api.v1') {
  throw new Error('Invalid frozen Image-Fit QR fixture')
}

export const IMAGE_FIT_CONTRACT = {
  schemaVersion: imageFitFixture.schema_version,
  request: controlledRuntimeRequest,
  balancedCandidate,
  controls: {
    treatments: controlProperties.treatment.enum,
    strengths: controlProperties.strength.enum,
    details: controlProperties.detail.enum,
    logoSizes: controlProperties.logo_size.enum,
    linkModes: controlProperties.link_mode.enum,
  },
} as const

export type ImageFitTreatment = (typeof IMAGE_FIT_CONTRACT.controls.treatments)[number]
export type ImageFitStrength = (typeof IMAGE_FIT_CONTRACT.controls.strengths)[number]
export type ImageFitDetail = (typeof IMAGE_FIT_CONTRACT.controls.details)[number]
export type ImageFitLogoSize = (typeof IMAGE_FIT_CONTRACT.controls.logoSizes)[number]
export type ImageFitLinkMode = (typeof IMAGE_FIT_CONTRACT.controls.linkModes)[number]
