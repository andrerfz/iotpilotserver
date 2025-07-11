// reui.config.cjs
/** @type {import('@reui/core').Config} */
module.exports = {
    theme: {
        extend: {
            colors: {
                // Custom colors for your IoT Pilot theme
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6', // Your main blue
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                },
                success: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                },
                warning: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    200: '#fde68a',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                    800: '#92400e',
                    900: '#78350f',
                },
                danger: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                }
            },
            borderRadius: {
                'lg': '0.5rem',
                'xl': '0.75rem',
                '2xl': '1rem',
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
            }
        }
    },
    components: {
        // Component-specific overrides
        Card: {
            defaultProps: {
                variant: 'outlined',
                elevation: 1,
            },
            styles: {
                root: {
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }
            }
        },
        Button: {
            defaultProps: {
                size: 'medium',
                variant: 'contained',
            },
            styles: {
                root: {
                    fontWeight: 500,
                    textTransform: 'none',
                    borderRadius: '0.375rem',
                }
            }
        },
        Badge: {
            defaultProps: {
                variant: 'contained',
                size: 'small',
            }
        }
    }
};
