import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useUserCommands} from '@/hooks/commands/use-user-commands';

// Mock fetch globally
global.fetch = vi.fn();

describe('useUserCommands Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            const mockResponse = {
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'USER'
                }
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const { result } = renderHook(() => useUserCommands());

            const response = await result.current.registerUser({
                email: 'test@example.com',
                password: 'SecurePass123!',
                username: 'testuser'
            } as any);

            expect(response).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/auth/register',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        it('should handle registration errors', async () => {
            const mockError = { error: 'Email already exists' };

            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: async () => mockError
            });

            const { result } = renderHook(() => useUserCommands());

            await expect(
                result.current.registerUser({
                    email: 'existing@example.com',
                    password: 'SecurePass123!',
                    username: 'existinguser'
                } as any)
            ).rejects.toThrow();

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
            });
        });
    });

    describe('authenticateUser', () => {
        it('should authenticate user successfully', async () => {
            const mockResponse = {
                user: {
                    id: 'user-123',
                    email: 'test@example.com',
                    username: 'testuser',
                    role: 'USER',
                    customerId: 'customer-123'
                },
                token: 'jwt-token-here'
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const { result } = renderHook(() => useUserCommands());

            const response = await result.current.authenticateUser({
                email: 'test@example.com',
                password: 'SecurePass123!',
                rememberMe: false
            } as any);

            expect(response).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/auth/login',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include'
                })
            );
        });

        it('should handle authentication failures', async () => {
            const mockError = { error: 'Invalid credentials' };

            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => mockError
            });

            const { result } = renderHook(() => useUserCommands());

            await expect(
                result.current.authenticateUser({
                    email: 'wrong@example.com',
                    password: 'WrongPassword',
                    rememberMe: false
                } as any)
            ).rejects.toThrow();
        });

        it('should include rememberMe flag in request', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ user: {}, token: 'token' })
            });

            const { result } = renderHook(() => useUserCommands());

            await result.current.authenticateUser({
                email: 'test@example.com',
                password: 'SecurePass123!',
                rememberMe: true
            } as any);

            const callArgs = (global.fetch as any).mock.calls[0];
            const requestBody = JSON.parse(callArgs[1].body);
            expect(requestBody.rememberMe).toBe(true);
        });
    });

    describe('logoutUser', () => {
        it('should logout user successfully', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Logged out successfully' })
            });

            const { result } = renderHook(() => useUserCommands());

            await result.current.logoutUser({} as any);

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include'
                })
            );
        });
    });

    describe('loading states', () => {
        it('should set loading state during command execution', async () => {
            (global.fetch as any).mockImplementationOnce(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: async () => ({ user: {} })
                }), 100))
            );

            const { result } = renderHook(() => useUserCommands());

            const promise = result.current.registerUser({
                email: 'test@example.com',
                password: 'SecurePass123!',
                username: 'testuser'
            } as any);

            await waitFor(() => {
                expect(result.current.loading).toBe(true);
            });

            await promise;

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it('should aggregate loading states from multiple commands', async () => {
            const { result } = renderHook(() => useUserCommands());

            expect(result.current.loading).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useUserCommands());

            await expect(
                result.current.authenticateUser({
                    email: 'test@example.com',
                    password: 'password'
                } as any)
            ).rejects.toThrow('Network error');
        });

        it('should handle malformed JSON responses', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => { throw new Error('Invalid JSON'); }
            });

            const { result } = renderHook(() => useUserCommands());

            await expect(
                result.current.registerUser({
                    email: 'test@example.com',
                    password: 'password'
                } as any)
            ).rejects.toThrow();
        });
    });
});

