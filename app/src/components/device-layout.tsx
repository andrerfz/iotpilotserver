'use client';

import {ChevronLeft, Server} from 'lucide-react';
import Link from 'next/link';
import {Suspense} from 'react';
import {Button, Navbar, NavbarBrand, NavbarContent, Spinner} from '@heroui/react';

export default function DeviceLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: {
        id: string
    };
}) {
    return (
        <div className="min-h-screen bg-default-50">
            {/* Header - Fixed alignment */}
            <Navbar className="border-b border-divider">
                <NavbarContent justify="start">
                    <NavbarBrand>
                        <div className="flex items-center">
                            <Server className="w-8 h-8 text-primary-600 mr-3"/>
                            <div>
                                <h1 className="text-xl font-bold">IoT Pilot</h1>
                                <p className="text-sm text-default-500">Device Management Dashboard</p>
                            </div>
                        </div>
                    </NavbarBrand>
                </NavbarContent>

                <NavbarContent justify="center">
                    <div className="text-center">
                        <p className="text-sm font-medium text-default-700">
                            Device Details
                        </p>
                        <p className="text-xs text-default-500">
                            {params.id}
                        </p>
                    </div>
                </NavbarContent>

                <NavbarContent justify="end">
                    <Button
                        as={Link}
                        href="/"
                        variant="light"
                        color="primary"
                        startContent={<ChevronLeft className="w-4 h-4"/>}
                        size="sm"
                    >
                        Back to Dashboard
                    </Button>
                </NavbarContent>
            </Navbar>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Suspense fallback={
                    <div className="flex justify-center items-center p-8">
                        <Spinner color="primary"/>
                        <p className="ml-2">Loading device details...</p>
                    </div>
                }>
                    {children}
                </Suspense>
            </div>
        </div>
    );
}