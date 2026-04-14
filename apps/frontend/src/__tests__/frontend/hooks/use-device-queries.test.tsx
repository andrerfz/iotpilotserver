import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useDeviceQueries} from '@/hooks/queries/use-device-queries';

// Mock fetch globally
global.fetch = vi.fn();

describe('useDeviceQueries Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listDevices', () => {
        it('should fetch devices list successfully', async () => {
            const mockDevices = {
                devices: [
                    {
                        id: 'device-1',
                        deviceId: 'dev-001',
                        hostname: 'test-device-1',
                        deviceType: 'PI_4',
                        status: 'ONLINE',
                        ipAddress: '192.168.1.100'
                    },
                    {
                        id: 'device-2',
                        deviceId: 'dev-002',
                        hostname: 'test-device-2',
                        deviceType: 'PI_3',
                        status: 'OFFLINE',
                        ipAddress: '192.168.1.101'
                    }
                ],
                stats: {
                    total: 2,
                    online: 1,
                    offline: 1
                }
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockDevices
            });

            const { result } = renderHook(() => useDeviceQueries());

            // Initially not loading
            expect(result.current.loading).toBe(false);

            // Execute the query
            const response = await result.current.listDevices({
                status: 'all',
                limit: 100
            } as any);

            // Verify the response
            expect(response).toEqual(mockDevices);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/devices'),
                expect.objectContaining({
                    method: 'GET',
                    credentials: 'include'
                })
            );
        });

        it('should handle API errors gracefully', async () => {
            const mockError = { error: 'Failed to fetch devices' };

            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => mockError
            });

            const { result } = renderHook(() => useDeviceQueries());

            await expect(
                result.current.listDevices({ status: 'all' } as any)
            ).rejects.toThrow('Failed to fetch devices');

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
            });
        });

        it('should include query parameters in the request', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ devices: [] })
            });

            const { result } = renderHook(() => useDeviceQueries());

            await result.current.listDevices({
                status: 'active',
                limit: 50,
                offset: 10,
                sortBy: 'hostname',
                sortDirection: 'asc'
            } as any);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('status=active'),
                expect.any(Object)
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('limit=50'),
                expect.any(Object)
            );
        });
    });

    describe('getDevice', () => {
        it('should fetch single device successfully', async () => {
            const mockDevice = {
                id: 'device-1',
                deviceId: 'dev-001',
                hostname: 'test-device',
                status: 'ONLINE'
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockDevice
            });

            const { result } = renderHook(() => useDeviceQueries());

            const response = await result.current.getDevice({
                deviceId: 'dev-001'
            } as any);

            expect(response).toEqual(mockDevice);
        });
    });

    describe('loading and error states', () => {
        it('should update loading state during fetch', async () => {
            (global.fetch as any).mockImplementationOnce(() => 
                new Promise(resolve => setTimeout(() => resolve({
                    ok: true,
                    json: async () => ({ devices: [] })
                }), 100))
            );

            const { result } = renderHook(() => useDeviceQueries());

            const promise = result.current.listDevices({} as any);

            // Should be loading
            await waitFor(() => {
                expect(result.current.loading).toBe(true);
            });

            await promise;

            // Should not be loading after completion
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });

        it('should clear previous errors on new request', async () => {
            // First request fails
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Error 1' })
            });

            const { result } = renderHook(() => useDeviceQueries());

            await expect(result.current.listDevices({} as any)).rejects.toThrow();

            await waitFor(() => {
                expect(result.current.error).toBeTruthy();
            });

            // Second request succeeds
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ devices: [] })
            });

            await result.current.listDevices({} as any);

            // Error should be cleared
            await waitFor(() => {
                expect(result.current.error).toBeNull();
            });
        });
    });
});

