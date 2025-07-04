import type {Metadata} from 'next';
import './globals.css';
import {AuthProvider} from '@/contexts/auth-context';
import {Providers} from "./providers";

export const metadata: Metadata = {
    title: 'IoT Pilot',
    description: 'Device Management Dashboard',
};

export default function RootLayout({children,}: { children: React.ReactNode; })
{
    return (
        <html lang="en">
        <head>
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
        </head>
        <body className="bg-gray-50">
        <Providers>
            <AuthProvider>
                {children}
            </AuthProvider>
        </Providers>
        </body>
        </html>
    );
}