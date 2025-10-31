'use client';

import React, { useState, useEffect } from 'react';
import { SelfQRcodeWrapper, SelfAppBuilder, type SelfApp } from '@selfxyz/qrcode';
import { getUniversalLink } from '@selfxyz/core';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface SelfVerificationQRProps {
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Self Protocol QR Code Verification Component
 * Displays QR code for human verification using Self Protocol
 * Uses inline expansion within parent component (ProfileModal)
 */
export function SelfVerificationQR({ onSuccess, onClose }: SelfVerificationQRProps) {
  const { address } = useAccount();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!address) {
      setError('No wallet connected');
      setIsInitializing(false);
      return;
    }

    try {
      // Get configuration from environment variables
      const scope = process.env.NEXT_PUBLIC_SELF_SCOPE!;
      const appName = process.env.NEXT_PUBLIC_SELF_APP_NAME!;
      const endpoint = process.env.NEXT_PUBLIC_SELF_ENDPOINT!;

      if (!endpoint) {
        throw new Error('NEXT_PUBLIC_SELF_ENDPOINT environment variable is not set');
      }

      // Build SelfApp configuration
      // CRITICAL: Use same scope as backend ("gigentic")
      // CRITICAL: Use short RPC endpoint to avoid BigInt errors
      const app = new SelfAppBuilder({
        version: 2,
        appName: appName,
        scope: scope,
        endpoint: endpoint,
        endpointType: 'staging_https',
        userIdType: 'hex',
        userId: address,
        logoBase64: 'https://i.postimg.cc/mrmVf9hm/self.png', // Self Protocol default logo
        userDefinedData: `Verify ${address}`,
        disclosures: {
          // Verification requirements (must match backend)
          minimumAge: 18,
          excludedCountries: ['IRN', 'PRK'], // Direct ISO codes
          ofac: false,
        },
      }).build();

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
      setIsInitializing(false);
    } catch (err) {
      console.error('Failed to initialize Self app:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize verification');
      setIsInitializing(false);
    }
  }, [address]);

  const handleSuccess = () => {
    console.log('Self Protocol verification successful!');
    onSuccess();
  };

  const handleError = () => {
    console.error('Self Protocol verification failed');
    setError('Verification failed. Please try again.');
  };

  const openSelfApp = () => {
    if (universalLink) {
      window.location.href = universalLink;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Initializing verification...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-destructive">Error</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button onClick={onClose} variant="outline" size="sm">
          Close
        </Button>
      </div>
    );
  }

  if (!selfApp) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Unable to load verification</p>
        <Button onClick={onClose} variant="outline" size="sm" className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center space-y-4 p-4 border rounded-lg bg-background">
      {/* Close button */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Header */}
      <div className="text-center space-y-1 pt-4">
        <h3 className="text-lg font-semibold">Verify Your Humanity</h3>
        <p className="text-sm text-muted-foreground">
          {isMobile ? "Open Self app to verify" : "Scan QR with Self app to verify"}
        </p>
      </div>

      {/* QR Code - Desktop Only */}
      {!isMobile && (
        <div className="flex justify-center w-full">
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      )}

      {/* Mobile button for direct app opening - Mobile Only */}
      {isMobile && (
        <div className="w-full space-y-2">
          <Button
            onClick={openSelfApp}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Open Self App
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Don&apos;t have the Self app?{' '}
            <a
              href="https://self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Download here
            </a>
          </p>
        </div>
      )}

      {/* Desktop download link - Desktop Only */}
      {!isMobile && (
        <p className="text-xs text-center text-muted-foreground">
          Don&apos;t have the Self app?{' '}
          <a
            href="https://self.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Download here
          </a>
        </p>
      )}
    </div>
  );
}
