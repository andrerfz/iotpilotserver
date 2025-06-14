'use client';

import {Suspense} from 'react';
import Link from 'next/link';
import AppLogo from '@/components/app-logo';
import LoginForm from '@/components/login-form';
import {Card, CardBody, Chip, Link as HeroLink, Spinner} from '@heroui/react';
import {isDevelopment} from '@/lib/env';

export function LoginPage() {
    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Section - Centered */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <AppLogo size="lg" showSubtitle={true}/>
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
