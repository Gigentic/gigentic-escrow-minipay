import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { ThemeProvider } from '@/components/theme-provider';

// Lazy load Toaster - only needed when notifications are triggered
const Toaster = dynamic(
  () => import('@/components/ui/sonner').then(mod => mod.Toaster),
  { ssr: false }
);

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent flash of invisible text (FOIT)
});

export const metadata: Metadata = {
  title: 'Gigentic CheckPay',
  description: 'Send money through an escrow with built in AI dispute resolution',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to RPC endpoints for faster blockchain interactions */}
        <link rel="preconnect" href="https://forno.celo.org" />
        <link rel="preconnect" href="https://forno.celo-sepolia.celo-testnet.org" />
        {/* Preconnect to WalletConnect for faster wallet connections */}
        <link rel="preconnect" href="https://relay.walletconnect.com" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Route-specific layouts (public/protected) will add navigation */}
          {children}
          <Toaster />
        </ThemeProvider>
        {/* Load analytics asynchronously to avoid blocking initial render */}
        <Script
          src="/_vercel/insights/script.js"
          strategy="lazyOnload"
        />
        <Script
          src="/_vercel/speed-insights/script.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
