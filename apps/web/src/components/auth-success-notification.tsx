"use client";

import { useEffect, useState } from 'react';

interface AuthSuccessNotificationProps {
  show: boolean;
}

export function AuthSuccessNotification({ show }: AuthSuccessNotificationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
      <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-medium">Authentication successful!</span>
        </div>
      </div>
    </div>
  );
}
