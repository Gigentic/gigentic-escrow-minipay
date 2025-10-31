import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  isVerified?: boolean;
  verifiedAt?: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Verification Badge Component
 * Displays a checkmark icon and "Verified Human" label when user is verified
 * Used in profile displays to show Self Protocol verification status
 */
export function VerificationBadge({
  isVerified = false,
  verifiedAt,
  className,
  showLabel = true,
  size = 'md',
}: VerificationBadgeProps) {
  if (!isVerified) {
    return null;
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <CheckCircle2
        className={cn(
          iconSizes[size],
          'text-green-600 dark:text-green-500 flex-shrink-0'
        )}
      />
      {showLabel && (
        <div className="flex flex-col">
          <span
            className={cn(
              textSizes[size],
              'font-medium text-green-600 dark:text-green-500'
            )}
          >
            Verified Human
          </span>
          {verifiedAt && (
            <span className="text-xs text-muted-foreground">
              {formatDate(verifiedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline Verification Icon (for compact displays)
 * Shows only the checkmark icon
 */
export function VerificationIcon({
  isVerified = false,
  className,
}: {
  isVerified?: boolean;
  className?: string;
}) {
  if (!isVerified) {
    return null;
  }

  return (
    <div title="Verified Human">
      <CheckCircle2
        className={cn(
          'h-4 w-4 text-green-600 dark:text-green-500',
          className
        )}
      />
    </div>
  );
}
