/** @type {import('next').NextConfig} */
const path = require('path');

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
    // Include @iotpilot/core in Next.js compilation — it's a TypeScript
    // workspace package and needs SWC/babel to process its .ts files.
    // The exports field in packages/core/package.json maps ./* → ./src/*.
    transpilePackages: ['@iotpilot/core'],

    // Exclude SSH2 from server components bundling (Next.js 14+)
    serverComponentsExternalPackages: ['ssh2', 'ssh2-streams', 'node-ssh', 'cpu-features'],
    
    images: {
        domains: ['localhost', 'iotpilot.app', 'iotpilotserver.test', 'dashboarddev.iotpilot.app'],
        unoptimized: true,
    },
    async rewrites() {
        return [
            {
                source: '/grafana/:path*',
                destination: 'http://grafana:3000/:path*',
            },
        ];
    },
    webpack: (config, { isServer, dev, webpack }) => {
        // Map @iotpilot/core/* to packages/core/src/* so webpack resolves
        // the same path that TypeScript's path alias resolves to.
        // Without this, pnpm's symlink points to packages/core/ (root)
        // but the source files live under packages/core/src/.
        config.resolve.alias = config.resolve.alias || {};
        // pnpm symlink @iotpilot/core → packages/core (root), but source is in src/.
        // This alias makes webpack resolve @iotpilot/core/x to packages/core/src/x.
        config.resolve.alias['@iotpilot/core'] = path.resolve(__dirname, '../../packages/core/src');

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
            // SSH2 mocks live in packages/core (moved during Phase 1 DDD migration)
            const coreMocks = path.resolve(__dirname, '../../packages/core/src/__mocks__');
            config.resolve.alias['ssh2'] = path.join(coreMocks, 'ssh2.js');
            config.resolve.alias['node-ssh'] = path.join(coreMocks, 'node-ssh.js');
            config.resolve.alias['ssh2-streams'] = path.join(coreMocks, 'ssh2.js');
            
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
