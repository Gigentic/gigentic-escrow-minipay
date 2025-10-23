"use client";

import { ConnectButton as RainbowKitConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export function ConnectButton() {
  const [isMinipay, setIsMinipay] = useState(false);
  const { chain } = useAccount();
  // const isDev = process.env.NEXT_PUBLIC_APP_ENV !== "prod";
  const isDev = true;

  useEffect(() => {
    // @ts-ignore
    if (window.ethereum?.isMiniPay) {
      setIsMinipay(true);
    }
  }, []);

  if (isMinipay) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {isDev && chain && (
        <div className="hidden sm:flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
          {chain.name}
        </div>
      )}
      <RainbowKitConnectButton chainStatus="none" />
    </div>
  );
}