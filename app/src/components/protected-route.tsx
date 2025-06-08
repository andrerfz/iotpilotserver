'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/contexts/auth-context';
import {Server} from 'lucide-react';
import {Card, CardBody, Spinner} from '@heroui/react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'ADMIN' | 'USER' | 'READONLY';
    fallback?: React.ReactNode;
}

export default function ProtectedRoute({
    children,
    requiredRole,
    fallback
}: ProtectedRouteProps) {
    const {
        user,
        loading
    } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Show loading state
    if (loading) {
        return fallback || (
            <div className="min-h-screen bg-default-50 flex items-center justify-center">
                <div className="text-center">
                    <Spinner size="lg" color="primary" className="mx-auto"/>
                    <p className="mt-4 text-default-600">Loading...</p>
                </div>
            </div>
        );
    }

    // User not authenticated
    if (!user) {
        return fallback || (
            <div className="min-h-screen bg-default-50 flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardBody className="text-center py-8">
                        <Server className="w-16 h-16 text-default-400 mx-auto mb-4"/>
                        <h2 className="text-xl font-semibold text-foreground mb-2">Authentication Required</h2>
                        <p className="text-default-600">Please log in to access this page.</p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    // Check role requirements
    if (requiredRole) {
        const roleHierarchy = {
            READONLY: 0,
            USER: 1,
            ADMIN: 2
        };
        const userLevel = roleHierarchy[user.role];
        const requiredLevel = roleHierarchy[requiredRole];

        if (userLevel < requiredLevel) {
            return fallback || (
                <div className="min-h-screen bg-default-50 flex items-center justify-center">
                    <Card className="max-w-md w-full bg-danger-50 border-danger">
                        <CardBody className="text-center py-8">
                            <Server className="w-16 h-16 text-danger mx-auto mb-4"/>
                            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
                            <p className="text-default-600">
                                You need {requiredRole} role to access this page.
                            </p>
                            <p className="text-sm text-default-500 mt-2">
                                Your current role: {user.role}
                            </p>
                        </CardBody>
                    </Card>
                </div>
            );
        }
    }

    return <>{children}</>;
}
