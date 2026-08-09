import React from 'react'
import { useStudioStore } from './store'
import ArtDirectionPanel from './components/ArtDirectionPanel'
import CandidateBoard from './components/CandidateBoard'
import ExportPanel from './components/ExportPanel'
import RecoveryPanel from './components/RecoveryPanel'
import CheckoutPanel from './components/CheckoutPanel'
import CreatorSignatureIconConcept from './components/CreatorSignatureIconConcept'
import CreatorSignatureSpaceConcept from './components/CreatorSignatureSpaceConcept'
import ImageFitQrConcept from './components/ImageFitQrConcept'

const CREATOR_SIGNATURE_CONCEPT_PATH = '/concepts/creator-signature-ux/creator'
const CREATOR_SIGNATURE_SPACE_CONCEPT_PATH = '/concepts/creator-signature-ux/space-creator'
const IMAGE_FIT_QR_CONCEPT_PATH = '/concepts/level2-image-fit-qr'

const App: React.FC = () => {
  const { project, resetProject } = useStudioStore()
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const showSecondaryWorkflow = searchParams.get('workflow') === 'internal'
  if (pathname === IMAGE_FIT_QR_CONCEPT_PATH) return <ImageFitQrConcept />
  if (pathname === CREATOR_SIGNATURE_CONCEPT_PATH) {
    return <CreatorSignatureIconConcept />
  }
  if (pathname === CREATOR_SIGNATURE_SPACE_CONCEPT_PATH) {
    return <CreatorSignatureSpaceConcept />
  }
  const noScrollVariant = !showSecondaryWorkflow && searchParams.get('uxVariant') !== 'scroll'
  const hasLivePayloadPreviewEntitlement = showSecondaryWorkflow || project.entitlement.type !== 'preview'

  return (
    <div
      data-testid="studio-app"
      data-ux-variant={noScrollVariant ? 'no-scroll' : 'default'}
      className={`${noScrollVariant ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} bg-slate-950`}
    >
      <header className={`${noScrollVariant ? 'relative' : 'sticky top-0'} z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur`}>
        <div className={`mx-auto flex max-w-6xl items-center justify-between px-3 ${noScrollVariant ? 'py-1.5' : 'py-2.5'} sm:px-4`}>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-studio-600 text-xs font-bold text-white">QR</div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">Artistic QR Studio</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={IMAGE_FIT_QR_CONCEPT_PATH}
              aria-label="Open Level 2 Image-Fit QR concept — validated fixture, export locked"
              className="flex min-h-7 flex-col justify-center rounded-md border border-studio-700/70 bg-studio-950/50 px-2 text-left leading-none text-studio-200 transition-colors hover:border-studio-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-studio-400"
            >
              <span className="text-[10px] font-semibold">Image-Fit QR</span>
              <span className="mt-0.5 text-[8px] text-slate-500">Level 2 · export locked</span>
            </a>
            <span className="hidden text-xs text-slate-500 sm:inline">
              Project: <code className="text-slate-400">{project.projectId.slice(0, 8)}</code>
            </span>
            <button
              type="button"
              onClick={resetProject}
              className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-300"
            >
              New
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-6xl px-3 sm:px-4 ${noScrollVariant ? 'flex h-[calc(100dvh-41px)] flex-col gap-1.5 overflow-hidden py-1.5' : 'space-y-4 py-3 sm:py-5'}`}>
        <ArtDirectionPanel noScrollVariant={noScrollVariant} livePreviewPayloadUpdates={hasLivePayloadPreviewEntitlement} creatorSignatureCardAlt />

        {showSecondaryWorkflow && <section aria-labelledby="finish-title" className="space-y-3 border-t border-slate-900 pt-4">
          <div>
            <h2 id="finish-title" className="text-sm font-semibold text-slate-300">Generate, validate & export</h2>
            <p className="text-[10px] text-slate-600">Candidate comparison remains available as a secondary validation workflow.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CandidateBoard />
            <div className="flex flex-col gap-4">
              <CheckoutPanel />
              <ExportPanel />
              <RecoveryPanel />
            </div>
          </div>
        </section>}
      </main>

      <footer className={`${noScrollVariant ? 'hidden' : 'mt-8 border-t border-slate-900 py-5'}`}>
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-xs text-slate-600">Artistic QR Studio · Live Core-backed design preview</p>
        </div>
      </footer>
    </div>
  )
}

export default App
