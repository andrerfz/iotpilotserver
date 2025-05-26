// app/src/app/devices/[id]/layout.tsx
import { Server, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

export default function DeviceLayout({
                                         children,
                                         params
                                     }: {
    children: React.ReactNode;
    params: { id: string };
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <Server className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">IoT Pilot</h1>
                                <p className="text-sm text-gray-500">Device Management Dashboard</p>
                            </div>
                        </div>
                        <div>
                            <Link
                                href="/"
                                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Suspense fallback={<div>Loading device details...</div>}>
                    {children}
                </Suspense>
            </main>
        </div>
    );
}