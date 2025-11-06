import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
// import { Analytics } from "@vercel/analytics/next"
// import { SpeedInsights } from "@vercel/speed-insights/next"
import { Navbar } from '@/components/navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { WalletProvider } from '@/components/wallet/wallet-provider';
import { wagmiSsrConfig } from '@/config/wagmi-ssr';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gigentic CheckPay',
  description: 'Send money through an escrow with built in AI dispute resolution',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Extract cookies and create initial state for SSR
  const initialState = cookieToInitialState(
    wagmiSsrConfig,
    (await headers()).get('cookie')
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Navbar is included on all pages */}
          <div className="relative flex min-h-screen flex-col">
            <WalletProvider initialState={initialState}>
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
            </WalletProvider>
          </div>
          <Toaster />
          {/* <Analytics />
          <SpeedInsights /> */}
        </ThemeProvider>
      </body>
    </html>
  );
}
