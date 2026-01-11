import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
    title: 'Store Management System',
    description: 'Premium Store Management Solution',
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "POS System",
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport: Viewport = {
    themeColor: "#4f46e5",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 min-h-screen" suppressHydrationWarning>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
