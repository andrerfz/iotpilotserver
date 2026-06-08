import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {AuthProvider, useAuth} from '@/contexts/auth-context';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
    }),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create a wrapper with AuthProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
);

const mockUser = {
    id: 'user-123',
    email: 'manager@iotpilot.app',
    username: 'manager',
    role: 'SUPERADMIN' as const,
    createdAt: '2025-01-01T00:00:00.000Z',
    _count: { devices: 5, alerts: 2 },
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkAuth - API response envelope extraction', () => {
        it('should extract user from standard ApiResponse format { success, data: { user } }', async () => {
            // This is the format returned by ApiResponse.ok({ user: userData })
            const apiResponse = {
                success: true,
                data: { user: mockUser },
                timestamp: new Date().toISOString(),
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => apiResponse,
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toEqual(mockUser);
            expect(result.current.user?.email).toBe('manager@iotpilot.app');
        });

        it('should extract user from flat format { user } for backward compatibility', async () => {
            // Fallback format without data envelope
            const flatResponse = { user: mockUser };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => flatResponse,
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toEqual(mockUser);
        });

        it('should NOT set user when data envelope exists but user is missing', async () => {
            // Edge case: API returns success but no user in data
            const apiResponse = {
                success: true,
                data: {},
                timestamp: new Date().toISOString(),
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => apiResponse,
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBeUndefined();
        });

        it('should set user to null on 401 response', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBeNull();
        });

        it('should set user to null on network error', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBeNull();
        });
    });

    describe('login - API response envelope extraction', () => {
        it('should extract user from standard ApiResponse format on login', async () => {
            // First call: checkAuth on mount (returns 401)
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Second call: login
            const loginResponse = {
                success: true,
                data: {
                    user: mockUser,
                    token: 'jwt-token-here',
                },
                timestamp: new Date().toISOString(),
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => loginResponse,
            });

            await act(async () => {
                await result.current.login('manager@iotpilot.app', 'password123');
            });

            expect(result.current.user).toEqual(mockUser);
            expect(result.current.user?.email).toBe('manager@iotpilot.app');
            expect(result.current.user?.role).toBe('SUPERADMIN');
        });

        it('should throw on failed login', async () => {
            // First call: checkAuth on mount
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            // Second call: failed login
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Invalid credentials' }),
            });

            await expect(
                act(async () => {
                    await result.current.login('wrong@email.com', 'wrongpass');
                })
            ).rejects.toThrow('Invalid credentials');

            expect(result.current.user).toBeNull();
        });
    });

    describe('refreshUser', () => {
        it('should update user data after refresh', async () => {
            // First call: checkAuth on mount (returns 401)
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            });

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.user).toBeNull();

            // Second call: refreshUser returns authenticated user
            const apiResponse = {
                success: true,
                data: { user: mockUser },
                timestamp: new Date().toISOString(),
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => apiResponse,
            });

            await act(async () => {
                await result.current.refreshUser();
            });

            expect(result.current.user).toEqual(mockUser);
        });
    });
});
