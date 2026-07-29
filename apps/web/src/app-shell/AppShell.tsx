'use client';

import Link from 'next/link';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <nav className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">QR Studio</Link>
          <div className="flex gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">Static QR</Link>
            <Link href="/artistic" className="text-gray-600 hover:text-gray-900">Artistic</Link>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-gray-100 border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 text-sm text-gray-500 text-center">
          QR Studio — MVP
        </div>
      </footer>
    </div>
  );
}
