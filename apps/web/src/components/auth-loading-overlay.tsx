"use client";

import { useEffect, useState } from 'react';

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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes auth-spin {
            to { transform: rotate(360deg); }
          }

          .auth-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .auth-overlay-content {
            background: white;
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            pointer-events: auto;
            max-width: 280px;
          }

          .auth-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: auth-spin 0.8s linear infinite;
          }

          .auth-overlay-text {
            font-size: 16px;
            font-weight: 500;
            color: #111827;
            text-align: center;
          }

          .auth-overlay-subtext {
            font-size: 14px;
            color: #6b7280;
            text-align: center;
          }
        `
      }} />

      <div className="auth-overlay">
        <div className="auth-overlay-content">
          <div className="auth-spinner" />
          <div className="auth-overlay-text">Signing in...</div>
          <div className="auth-overlay-subtext">
            Please confirm in your wallet
          </div>
        </div>
      </div>
    </>
  );
}
