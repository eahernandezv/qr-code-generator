'use client';

import { useState } from 'react';

export function StaticStudio() {
  const [url, setUrl] = useState('https://ernestohernan.dev');
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'url', content: url, errorCorrectionLevel: 'M' }),
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      setSvg(data.svg);
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Static QR Code</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
      {svg && (
        <div className="mt-4">
          <div className="border border-gray-200 rounded p-4 inline-block" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="mt-2 flex gap-2">
            <a
              href={`data:image/svg+xml,${encodeURIComponent(svg)}`}
              download="qr-code.svg"
              className="text-blue-600 hover:underline"
            >
              Download SVG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
