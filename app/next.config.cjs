/** @type {import('next').NextConfig} */

// Custom plugin to ignore specific modules
class IgnorePlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compiler) {
        const handler = (parser) => {
            parser.hooks.import.tap('IgnorePlugin', (statement, source) => {
                if (this.options.resourceRegExp.test(source)) {
                    return true;
                }
            });

            parser.hooks.call.for('require').tap('IgnorePlugin', (expression) => {
                if (expression.arguments.length === 1 && 
                    expression.arguments[0].type === 'Literal' && 
                    this.options.resourceRegExp.test(expression.arguments[0].value)) {
                    return true;
                }
            });
        };

        compiler.hooks.normalModuleFactory.tap('IgnorePlugin', (factory) => {
            factory.hooks.parser.for('javascript/auto').tap('IgnorePlugin', handler);
            factory.hooks.parser.for('javascript/dynamic').tap('IgnorePlugin', handler);
            factory.hooks.parser.for('javascript/esm').tap('IgnorePlugin', handler);
        });
    }
}

const nextConfig = {
    // Exclude SSH2 from server components bundling (Next.js 14+)
    serverComponentsExternalPackages: ['ssh2', 'ssh2-streams', 'node-ssh', 'cpu-features'],
    
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
    webpack: (config, { isServer, dev, webpack }) => {
        // Server-side: externalize SSH packages entirely
        if (isServer) {
            const externalPackages = ['ssh2', 'node-ssh', 'ssh2-streams', 'cpu-features'];
            
            // Wrap existing externals (properly handle callback pattern)
            const originalExternals = config.externals;
            config.externals = (context, request, callback) => {
                // Check if request matches any external package
                if (externalPackages.some(pkg => request === pkg || request.startsWith(`${pkg}/`))) {
                    callback(null, `commonjs ${request}`);
                    return;
                }
                
                // Handle original externals properly
                if (typeof originalExternals === 'function') {
                    originalExternals(context, request, callback);
                    return;
                }
                
                if (Array.isArray(originalExternals)) {
                    // Handle all types: strings, RegExp, and functions
                    for (const external of originalExternals) {
                        if (typeof external === 'string' && external === request) {
                            callback(null, `commonjs ${request}`);
                            return;
                        }
                        if (external instanceof RegExp && external.test(request)) {
                            callback(null, `commonjs ${request}`);
                            return;
                        }
                        if (typeof external === 'function') {
                            // Delegate to the external function
                            external(context, request, callback);
                            return;
                        }
                    }
                }
                
                // No match found, continue normally
                callback();
            };
        }
        
        // Client-side: use mocks
        if (!isServer) {
            config.resolve.alias = config.resolve.alias || {};
            config.resolve.alias['ssh2'] = require.resolve('./src/lib/__mocks__/ssh2.js');
            config.resolve.alias['node-ssh'] = require.resolve('./src/lib/__mocks__/node-ssh.js');
            config.resolve.alias['ssh2-streams'] = require.resolve('./src/lib/__mocks__/ssh2.js');
            
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
                'child_process': false,
            };
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

    // Note: 'standalone' output doesn't work well with custom servers (server.cjs)
    // output: 'standalone',

    // Disable source maps for chrome extensions in dev
    devIndicators: {
        buildActivityPosition: 'bottom-right',
    },
}

module.exports = nextConfig
