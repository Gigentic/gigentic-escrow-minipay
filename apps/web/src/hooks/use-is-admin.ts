"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

/**
 * Fetch admin status from API
 */
async function fetchAdminStatus(): Promise<{ isAdmin: boolean }> {
  const response = await fetch("/api/admin/check");

  if (!response.ok) {
    throw new Error("Failed to check admin status");
  }

  return response.json();
}

/**
 * Hook to check if the current user is an admin
 * Returns loading state and admin status
 */
export function useIsAdmin() {
  const { status } = useSession();

  const query = useQuery({
    queryKey: ["admin-status"],
    queryFn: fetchAdminStatus,
    enabled: status === "authenticated", // Only check if user is authenticated
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
  });

  return {
    isAdmin: query.data?.isAdmin ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
