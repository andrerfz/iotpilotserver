'use client';

import Link from 'next/link';
import AppLogo from '@/components/app-logo';
import RegistrationForm from '@/components/registration-form';
import {Card, CardBody, Link as HeroLink, Spacer} from '@heroui/react';

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-default-50 flex flex-col justify-center py-12 px-4">
            <div className="max-w-sm mx-auto w-full flex flex-col items-center">
                {/* Logo */}
                <AppLogo/>

                <Spacer y={6}/>

                <h2 className="text-2xl font-bold text-center">
                    Create your account
                </h2>
                <p className="text-sm text-default-600 text-center mt-2">
                    Or{' '}
                    <HeroLink as={Link} href="/login" color="primary">
                        sign in to existing account
                    </HeroLink>
                </p>

                <Spacer y={8}/>

                <Card className="w-full max-w-md">
                    <CardBody className="py-8 px-6">
                        <RegistrationForm/>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
