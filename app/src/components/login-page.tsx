'use client';

import {Suspense} from 'react';
import Link from 'next/link';
import AppLogo from '@/components/app-logo';
import LoginForm from '@/components/login-form';
import {Card, CardBody, Link as HeroLink, Spacer, Spinner} from '@heroui/react';

export function LoginPage() {
    return (
        <div className="min-h-screen bg-default-50 flex flex-col justify-center py-12 px-4">
            <div className="max-w-sm mx-auto w-full flex flex-col items-center">
                {/* Logo */}
                <AppLogo/>

                <Spacer y={6}/>

                <h2 className="text-2xl font-bold text-center">
                    Sign in to your account
                </h2>
                <p className="text-sm text-default-600 text-center mt-2">
                    Or{' '}
                    <HeroLink as={Link} href="/register" color="primary">
                        create a new account
                    </HeroLink>
                </p>

                <Spacer y={8}/>

                <Card className="w-full max-w-md">
                    <CardBody className="py-8 px-6">
                        <LoginForm/>
                    </CardBody>
                </Card>
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
