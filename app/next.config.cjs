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
        // Add resolve alias to use the mock ssh2 library during build
        config.resolve = config.resolve || {};
        config.resolve.alias = config.resolve.alias || {};
        config.resolve.alias['ssh2'] = require.resolve('./src/lib/ssh2-mock.cjs');

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
        const externalsToAdd = ['ssh2', 'ssh2-streams'];

        // Function to handle .node files and ssh2 modules
        const externalFunc = ({ context, request }, callback) => {
            if (request.includes('ssh2') || request.endsWith('.node')) {
                // Externalize to a commonjs module
                return callback(null, 'commonjs ' + request);
            }
            callback();
        };

        if (Array.isArray(config.externals)) {
            config.externals.push(externalFunc);
            config.externals.push(...externalsToAdd);
        } else if (typeof config.externals === 'function') {
            const prevExternals = config.externals;
            config.externals = (ctx, cb) => {
                externalFunc(ctx, (err, result) => {
                    if (err || result) return cb(err, result);
                    prevExternals(ctx, cb);
                });
            };
        } else {
            config.externals = [
                externalFunc,
                ...externalsToAdd,
                ...(config.externals ? [config.externals] : [])
            ];
        }

        // Create a rule for .node files
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];

        // Remove any existing rules for .node files
        config.module.rules = config.module.rules.filter(rule => 
            !(rule.test && rule.test.toString().includes('.node'))
        );

        // Add a rule to handle .node files
        if (!isServer) {
            // On the client, use null-loader for all .node files
            config.module.rules.push({
                test: /\.node$/,
                use: 'null-loader'
            });
        } else {
            // On the server, add a function to the externals to handle .node files
            if (Array.isArray(config.externals)) {
                config.externals.push(({ request }, callback) => {
                    if (request.endsWith('.node')) {
                        return callback(null, 'commonjs ' + request);
                    }
                    callback();
                });
            } else {
                const existingExternals = config.externals;
                config.externals = [
                    ({ request }, callback) => {
                        if (request.endsWith('.node')) {
                            return callback(null, 'commonjs ' + request);
                        }
                        callback();
                    },
                    ...(existingExternals ? [existingExternals] : [])
                ];
            }
        }

        // Add specific rules for ssh2 and its dependencies
        config.module.rules.push(
            {
                test: /\.node$/,
                loader: 'null-loader',
            },
            {
                test: /node_modules\/ssh2/,
                loader: 'null-loader',
            }
        );

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
