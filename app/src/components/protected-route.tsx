'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Server } from 'lucide-react';

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
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Show loading state
    if (loading) {
        return fallback || (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // User not authenticated
    if (!user) {
        return fallback || (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
                    <p className="text-gray-600">Please log in to access this page.</p>
                </div>
            </div>
        );
    }

    // Check role requirements
    if (requiredRole) {
        const roleHierarchy = { READONLY: 0, USER: 1, ADMIN: 2 };
        const userLevel = roleHierarchy[user.role];
        const requiredLevel = roleHierarchy[requiredRole];

        if (userLevel < requiredLevel) {
            return fallback || (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <Server className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                        <p className="text-gray-600">
                            You need {requiredRole} role to access this page.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Your current role: {user.role}
                        </p>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}