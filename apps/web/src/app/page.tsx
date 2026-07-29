import { StaticStudio } from '../features/static-studio/page';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">QR Studio</h1>
        <p className="text-lg text-gray-600 mb-8">
          Create beautiful, scannable artistic QR codes for your brand.
        </p>
        <StaticStudio />
      </div>
    </main>
  );
}
