"use client";

import { useState } from "react";
import { type Address } from "viem";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import { getAddressExplorerUrl } from "@/lib/utils";
import { CHAIN_ID } from "@/lib/escrow-config";

interface AddressDisplayProps {
  address: Address;
  className?: string;
  showCopy?: boolean;
  showExplorer?: boolean;
  truncate?: boolean;
  prefixLength?: number;
  suffixLength?: number;
}

/**
 * Address Display Component
 * Displays Ethereum addresses with optional copy-to-clipboard functionality
 * and explorer link support
 */
export function AddressDisplay({
  address,
  className = "",
  showCopy = true,
  showExplorer = true,
  truncate = true,
  prefixLength = 6,
  suffixLength = 4,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayAddress = truncate
    ? `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
    : address;

  const explorerUrl = getAddressExplorerUrl(address, CHAIN_ID);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showExplorer ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm hover:underline"
        >
          {displayAddress}
        </a>
      ) : (
        <span className="font-mono text-sm">{displayAddress}</span>
      )}
      {showCopy && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy address"}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}

