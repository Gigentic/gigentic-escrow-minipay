"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthLoadingOverlayProps {
  isAuthenticating: boolean;
}

export function AuthLoadingOverlay({ isAuthenticating }: AuthLoadingOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isAuthenticating) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-3xl p-8 shadow-xl flex flex-col items-center gap-4 pointer-events-auto max-w-[280px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-base font-medium text-gray-900 text-center">
          Signing in...
        </div>
        <div className="text-sm text-gray-600 text-center">
          Please confirm in your wallet
        </div>
      </div>
    </div>
  );
}
