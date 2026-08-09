import imageFitSchema from '../../../packages/contracts/schemas/image-fit-qr-api.v1.json'
import imageFitFixture from '../../../packages/contracts/fixtures/image-fit-qr/valid-balanced-response.v1.json'

const controlProperties = imageFitSchema.definitions.UserControlsV1.properties
const balancedCandidate = imageFitFixture.candidates[0]

if (!balancedCandidate || imageFitFixture.schema_version !== 'image-fit-qr-api.v1') {
  throw new Error('Invalid frozen Image-Fit QR fixture')
}

export const IMAGE_FIT_CONTRACT = {
  schemaVersion: imageFitFixture.schema_version,
  request: imageFitFixture.request,
  balancedCandidate,
  controls: {
    treatments: controlProperties.treatment.enum,
    strengths: controlProperties.strength.enum,
    details: controlProperties.detail.enum,
    linkModes: controlProperties.link_mode.enum,
  },
} as const

export type ImageFitTreatment = (typeof IMAGE_FIT_CONTRACT.controls.treatments)[number]
export type ImageFitStrength = (typeof IMAGE_FIT_CONTRACT.controls.strengths)[number]
export type ImageFitDetail = (typeof IMAGE_FIT_CONTRACT.controls.details)[number]
export type ImageFitLinkMode = (typeof IMAGE_FIT_CONTRACT.controls.linkModes)[number]
