import React from 'react'
import { useStudioStore } from './store'
import PayloadInput from './components/PayloadInput'
import ArtDirectionPanel from './components/ArtDirectionPanel'
import QRPreview from './components/QRPreview'
import CandidateBoard from './components/CandidateBoard'
import ExportPanel from './components/ExportPanel'
import RecoveryPanel from './components/RecoveryPanel'
import CheckoutPanel from './components/CheckoutPanel'

const App: React.FC = () => {
  const { project, resetProject } = useStudioStore()

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-studio-600 text-xs font-bold text-white">
              QR
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              Artistic QR Studio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              Project: <code className="text-slate-400">{project.projectId.slice(0, 8)}</code>
            </span>
            <button
              onClick={resetProject}
              className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-300"
            >
              New
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left column: Inputs */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <PayloadInput />
            <ArtDirectionPanel />
          </div>

          {/* Center: Preview */}
          <div className="lg:col-span-4">
            <div className="sticky top-20">
              <QRPreview size={320} className="mx-auto" />
            </div>
          </div>

          {/* Right: Candidates + Export + Recovery */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <CandidateBoard />
            <CheckoutPanel />
            <ExportPanel />
            <RecoveryPanel />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p className="text-xs text-slate-600">
            Artistic QR Studio · Preview mode · Export requires purchase
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
