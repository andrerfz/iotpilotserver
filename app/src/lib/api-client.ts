export class AuthenticatedApiClient {
    private static instance: AuthenticatedApiClient;
    private logoutCallback?: () => void;

    static getInstance(): AuthenticatedApiClient {
        if (!AuthenticatedApiClient.instance) {
            AuthenticatedApiClient.instance = new AuthenticatedApiClient();
        }
        return AuthenticatedApiClient.instance;
    }

    setLogoutCallback(callback: () => void): void {
        this.logoutCallback = callback;
    }

    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        const response = await fetch(url, {
            credentials: 'include',
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        // Handle 401 Unauthorized responses globally
        if (response.status === 401) {
            console.warn('🚨 API CLIENT: Received 401 Unauthorized - triggering logout');

            // Call logout callback to clear auth state
            if (this.logoutCallback) {
                this.logoutCallback();
            }

            // Redirect to login
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
        }

        return response;
    }
}

// Hook for making authenticated API calls
export function useAuthenticatedApi() {
    const apiClient = AuthenticatedApiClient.getInstance();
    return apiClient.fetch.bind(apiClient);
}