'use client';

import Link from 'next/link';

export default function ArtisticPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Artistic QR</h1>
        <p className="text-lg text-gray-600 mb-8">
          Coming soon — transform your QR codes into works of art.
        </p>
        <Link href="/" className="text-blue-600 hover:underline">← Back to Static QR</Link>
      </div>
    </main>
  );
}
