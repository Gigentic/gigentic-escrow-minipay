"use client";

import { useEffect } from "react";
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
  const { address, isConnected } = useAccount();
  const { status: sessionStatus } = useSession();
  const { isAuthenticating, signIn } = useAuthState();

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
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">🔐 Sign In to Continue</h1>

          {isConnected && address ? (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">You're connected with:</p>
              <p className="font-mono text-sm break-all">{address}</p>
            </div>
          ) : null}
        </div>

        {/* Explanation */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-foreground mb-3">
            To access CheckPay features, please sign a message to verify you own this wallet.
          </p>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>This is free and doesn't send a transaction</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isConnected ? (
            // Step 1: Connect Wallet (Custom styled to match brand)
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                First, connect your wallet:
              </p>
              <RainbowKitConnectButton.Custom>
                {({ openConnectModal }) => (
                  <Button
                    onClick={openConnectModal}
                    size="lg"
                    className="w-full"
                  >
                    Connect Wallet
                  </Button>
                )}
              </RainbowKitConnectButton.Custom>
            </div>
          ) : (
            // Step 2: Sign In with Wallet
            <Button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              size="lg"
              className="w-full"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In with Wallet"
              )}
            </Button>
          )}

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Homepage
          </Button>
        </div>
      </Card>
    </main>
  );
}
