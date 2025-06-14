'use client';

import {Suspense} from 'react';
import Link from 'next/link';
import AppLogo from '@/components/app-logo';
import LoginForm from '@/components/login-form';
import {Button, Card, Chip, CardBody, Link as HeroLink, Spacer, Spinner} from '@heroui/react';
import {isDevelopment} from '@/lib/env';
import {Server} from 'lucide-react';

export function LoginPage() {
    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Section - Centered */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-3 bg-primary-100 rounded-xl">
                            <Server className="w-8 h-8 text-primary-600"/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">IoT Pilot</h1>
                            <p className="text-sm text-gray-500">Device Management</p>
                        </div>
                    </div>

                    {isDevelopment() && (
                        <div className="flex justify-center">
                            <Chip
                                size="sm"
                                variant="flat"
                                color="secondary"
                                className="mb-4"
                            >
                                Development Environment
                            </Chip>
                        </div>
                    )}
                </div>

                {/* Login Card - Perfectly centered */}
                <div className="flex justify-center">
                    <Card className="w-full max-w-sm shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                        <CardBody className="p-8">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Sign in to your account
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Or{' '}
                                    <HeroLink as={Link} href="/register" color="primary" className="font-medium">
                                        create a new account
                                    </HeroLink>
                                </p>
                            </div>

                            <LoginForm/>

                            {/* Development Helper - Centered */}
                            {isDevelopment() && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <p className="text-xs font-medium text-gray-700">
                                            Development Login
                                        </p>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-600 mb-3 text-center">
                                        <div>Email: admin@iotpilot.local</div>
                                        <div>Password: admin</div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        color="secondary"
                                        className="w-full"
                                        onPress={() => {
                                            console.log('Fill dev credentials clicked');
                                        }}
                                    >
                                        Quick Fill Dev Login
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* Footer - Centered */}
                <div className="text-center mt-6">
                    <p className="text-xs text-gray-500">
                        Secure IoT device management platform
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPageWithSuspense() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-default-50 flex items-center justify-center">
                <div className="text-center">
                    <Spinner size="lg" color="primary" className="mx-auto"/>
                    <p className="text-default-600 mt-4">Loading...</p>
                </div>
            </div>
        }>
            <LoginPage/>
        </Suspense>
    );
}
