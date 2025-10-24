"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserProfile } from '@/lib/kv';

interface UpdateProfileData {
  name: string;
  bio: string;
}

/**
 * Fetch user profile by wallet address
 */
async function fetchProfile(address: string): Promise<UserProfile | null> {
  const response = await fetch(`/api/profile/${address}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}

/**
 * Update user profile
 */
async function updateProfile(data: UpdateProfileData): Promise<UserProfile> {
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }

  const result = await response.json();
  return result.profile;
}

/**
 * Hook to fetch and manage user profile
 */
export function useProfile(address: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch profile query
  const query = useQuery({
    queryKey: ['profile', address],
    queryFn: () => fetchProfile(address!),
    enabled: !!address, // Only fetch if address is provided
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Update profile mutation
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      // Update the cache with the new profile data
      if (address) {
        queryClient.setQueryData(['profile', address], data);
      }
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateProfile: mutation.mutate,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
