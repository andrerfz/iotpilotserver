'use client';

import {Suspense} from 'react';
import Link from 'next/link';
import {Card, CardBody, Chip, Divider, Link as HeroLink, Spacer, Spinner} from '@heroui/react';
import {isDevelopment} from '@/lib/env';
import AppLogo from '@/components/app-logo';
import LoginForm from '@/components/login-form';

export function LoginPage() {
    return (
        <div
            className="min-h-screen bg-gradient-to-br from-default-50 via-background to-default-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <AppLogo/>
                    </div>
                </div>

                {/* Login Card */}
                <Card className="shadow-large border-small border-default-200/50 bg-content1/50 backdrop-blur-md">
                    <CardBody className="p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-semibold text-foreground mb-2">
                                Welcome back
                            </h2>
                            <p className="text-default-500">
                                Sign in to your account to continue
                            </p>
                        </div>

                        <LoginForm/>

                        <Spacer y={6}/>

                        <Divider/>

                        <Spacer y={6}/>

                        <div className="text-center">
                            <p className="text-sm text-default-500">
                                Don't have an account?{' '}
                                <HeroLink
                                    as={Link}
                                    href="/register"
                                    color="primary"
                                    className="font-medium"
                                >
                                    Create account
                                </HeroLink>
                            </p>
                        </div>


                    </CardBody>
                </Card>

                {/* Footer */}
                <div className="text-center mt-10">
                    <p className="text-xs text-default-400">
                        Secure IoT device management platform
                    </p>
                </div>

                {isDevelopment() && (
                    <div className="flex justify-center mb-4">
                        <Chip
                            size="sm"
                            variant="flat"
                            color="warning"
                            className="shadow-sm"
                        >
                            Development Environment
                        </Chip>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LoginPageWithSuspense() {
    return (
        <Suspense fallback={
            <div
                className="min-h-screen bg-gradient-to-br from-default-50 via-background to-default-100 flex items-center justify-center">
                <div className="text-center">
                    <Spinner size="lg" color="primary" className="mx-auto"/>
                    <Spacer y={4}/>
                    <p className="text-default-500">Loading...</p>
                </div>
            </div>
        }>
            <LoginPage/>
        </Suspense>
    );
}