"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useSession } from "next-auth/react";
import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthState } from "@/components/wallet-provider";
import { Loader2, ArrowLeft, Info } from "lucide-react";
import Image from "next/image";

/**
 * Interstitial Sign-In Page
 *
 * This page provides a dedicated, explicit sign-in experience that solves
 * the auto-trigger bugs from the previous implementation.
 *
 * User flow:
 * 1. Land here from protected route (e.g., /create, /dashboard)
 * 2. See explanation of why sign-in is needed
 * 3. Connect wallet (if not connected)
 * 4. Click "Sign In with Wallet" button explicitly
 * 5. Sign message in wallet
 * 6. Redirect to intended destination
 */
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();
  const { status: sessionStatus } = useSession();
  const { isAuthenticating, signIn } = useAuthState();

  // State for info tooltip toggle
  const [showInfo, setShowInfo] = useState(false);

  // Get the redirect URL from query params (where to go after successful sign-in)
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const isAuthenticated = sessionStatus === "authenticated";

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log("Already authenticated, redirecting to:", redirectTo);
      router.push(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  // Handle sign-in button click
  const handleSignIn = async () => {
    try {
      await signIn();
      // Redirect happens in WalletProvider after successful auth
      // But we can also redirect here as backup
      setTimeout(() => {
        router.push(redirectTo);
      }, 1000);
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  // If already authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12">
      <Card className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/gigentic-logo-hex.png"
            alt="CheckPay Logo"
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">🔐 Sign In to Continue</h1>
        </div>

        {/* Step-by-Step Flow */}
        <div className="space-y-4 mb-6">
          {/* Step 1: Connect Wallet */}
          <div className={`p-4 rounded-lg border-2 transition-colors ${
            isConnected
              ? 'border-primary/20 bg-primary/5'
              : 'border-muted bg-background'
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                isConnected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isConnected ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">Connect your wallet</h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? '✓ Connected' : 'Select your Web3 wallet'}
                </p>
              </div>
            </div>

            {!isConnected && (
              <RainbowKitConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button
                    onClick={openConnectModal}
                    size="lg"
                    className="w-full"
                  >
                    Select Wallet
                  </Button>
                )}
              </RainbowKitConnectButton.Custom>
            )}
          </div>

          {/* Step 2: Sign In */}
          <div className={`p-4 rounded-lg border-2 transition-colors ${
            isConnected && !isAuthenticating
              ? 'border-muted bg-background'
              : 'border-muted/50 bg-muted/30'
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                isConnected
                  ? 'bg-muted text-foreground'
                  : 'bg-muted/50 text-muted-foreground'
              }`}>
                2
              </div>
              <div className="flex-1">
                <h3 className={`font-semibold text-base ${!isConnected && 'text-muted-foreground'}`}>
                  Sign in with wallet
                </h3>
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">
                    {isAuthenticating ? 'Waiting for signature...' : 'Verify wallet ownership'}
                  </p>
                  {!isAuthenticating && (
                    <button
                      type="button"
                      onClick={() => setShowInfo(!showInfo)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Information about wallet verification"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {showInfo && (
                  <button
                    type="button"
                    onClick={() => setShowInfo(false)}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
                  >
                    This is free and doesn't send a transaction
                  </button>
                )}
              </div>
            </div>

            {isConnected && (
              <>
                <Button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  size="lg"
                  className="w-full"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In with Wallet'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Homepage
        </Button>
      </Card>
    </main>
  );
}
