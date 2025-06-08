/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['localhost', 'iotpilot.app', 'iotpilotserver.test', 'dashboarddev.iotpilot.app'],
        unoptimized: true,
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: '/api/:path*',
            },
            {
                source: '/grafana/:path*',
                destination: 'http://grafana:3000/:path*',
            },
        ]
    },
    webpack: (config, { isServer, dev }) => {
        // Client-side polyfills
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                stream: false,
                url: false,
                zlib: false,
                http: false,
                https: false,
                assert: false,
                os: false,
                path: false,
            };
        }

        // Handle native modules for both client and server
        config.externals = config.externals || [];

        // Add ssh2 and related modules as external modules for both client and server
        const externalsToAdd = ['ssh2', 'ssh2-streams', 'ssh2/lib/protocol/crypto'];

        if (Array.isArray(config.externals)) {
            config.externals.push(...externalsToAdd);
            // Also add a function to handle .node files
            config.externals.push(({ request }, callback) => {
                // Externalize any .node files
                if (request.endsWith('.node')) {
                    return callback(null, 'commonjs ' + request);
                }
                callback();
            });
        } else {
            config.externals = [
                ...externalsToAdd,
                // Function to handle .node files
                ({ request }, callback) => {
                    if (request.endsWith('.node')) {
                        return callback(null, 'commonjs ' + request);
                    }
                    callback();
                },
                ...(config.externals ? [config.externals] : [])
            ];
        }

        // Create a null loader for .node files
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];
        config.module.rules.push({
            test: /\.node$/,
            use: 'null-loader'
        });

        // If null-loader is not available, use a custom null loader
        try {
            require.resolve('null-loader');
        } catch (e) {
            // Define a custom null loader if the package is not available
            config.module.rules.pop(); // Remove the previous rule
            config.module.rules.push({
                test: /\.node$/,
                loader: 'next/dist/compiled/ignore-loader'
            });
        }

        // Suppress browser extension errors in development
        if (dev) {
            config.infrastructureLogging = {
                level: 'error',
            }
        }

        return config
    },

    compiler: {
        removeConsole: process.env.NODE_ENV === "production"
    },

    // Disable error overlay in dev
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },

    output: 'standalone',

    // Disable source maps for chrome extensions in dev
    devIndicators: {
        buildActivityPosition: 'bottom-right',
    },
}

module.exports = nextConfig
