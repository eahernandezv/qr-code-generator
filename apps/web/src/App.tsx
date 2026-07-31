import React from 'react'
import { useStudioStore } from './store'
import PayloadInput from './components/PayloadInput'
import ArtDirectionPanel from './components/ArtDirectionPanel'
import CandidateBoard from './components/CandidateBoard'
import ExportPanel from './components/ExportPanel'
import RecoveryPanel from './components/RecoveryPanel'
import CheckoutPanel from './components/CheckoutPanel'

const App: React.FC = () => {
  const { project, resetProject } = useStudioStore()
  const destinationRef = React.useRef<HTMLDivElement>(null)

  const useDesign = () => {
    const destination = destinationRef.current
    if (typeof destination?.scrollIntoView === 'function') {
      destination.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    destination?.querySelector<HTMLTextAreaElement>('textarea')?.focus()
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-studio-600 text-xs font-bold text-white">QR</div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">Artistic QR Studio</h1>
          </div>
          <div className="flex items-center gap-3">
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

      <main className="mx-auto max-w-6xl space-y-4 px-3 py-3 sm:px-4 sm:py-5">
        <ArtDirectionPanel />

        <div className="flex flex-col items-center justify-between gap-2 rounded-2xl border border-studio-800/60 bg-studio-950/20 p-3 sm:flex-row">
          <div>
            <p className="text-xs font-semibold text-slate-200">Love this look?</p>
            <p className="text-[10px] text-slate-500">Add the real destination, then Core regenerates and validates it.</p>
          </div>
          <button
            type="button"
            onClick={useDesign}
            className="w-full rounded-xl bg-studio-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-studio-950/40 transition hover:bg-studio-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
          >
            Use this design
          </button>
        </div>

        <div ref={destinationRef} id="destination" className="scroll-mt-16">
          <PayloadInput />
        </div>

        <section aria-labelledby="finish-title" className="space-y-3 border-t border-slate-900 pt-4">
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
        </section>
      </main>

      <footer className="mt-8 border-t border-slate-900 py-5">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-xs text-slate-600">Artistic QR Studio · Live design preview · Export requires purchase</p>
        </div>
      </footer>
    </div>
  )
}

export default App
