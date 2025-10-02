import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Suspense } from 'react'
import { ConvexClientProvider } from './ConvexClientProvider'
import { AutumnClientProvider } from './AutumnClientProvider'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from './providers'
import { ConditionalMobileTabbar } from '@/components/conditional-mobile-tabbar'
import LayoutUserButton from '@/components/layout-user-button'

export const metadata: Metadata = {
  title: 'Dial0',
  description: 'Native-feeling iOS PWA for issue management',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dial0',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Dial0',
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Issues App" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          <ConvexClientProvider>
            {/* Top-right auth/user button (Better Auth UI) */}
            <LayoutUserButton />
            <AutumnClientProvider>
              {children}
            </AutumnClientProvider>
            {/* Hide mobile tab bar on the marketing landing page */}
            <Suspense fallback={null}>
              <ConditionalMobileTabbar />
            </Suspense>
            <Toaster />
          </ConvexClientProvider>
        </Providers>
      </body>
    </html>
  )
}
