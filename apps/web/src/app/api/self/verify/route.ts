import { NextRequest, NextResponse } from 'next/server';
import {
  SelfBackendVerifier,
  AllIds,
} from '@selfxyz/core';
import type { IConfigStorage } from '@selfxyz/core';
import { getProfile, setProfile } from '@/lib/kv';

// Custom config store to capture the user identifier
class CustomConfigStore implements IConfigStorage {
  public userIdentifier: string | null = null;
  private baseConfig: any;

  constructor(config: any) {
    this.baseConfig = config;
  }

  async getActionId(userIdentifier: string, userDefinedData?: string): Promise<string> {
    // Capture the user identifier that the SDK extracts
    this.userIdentifier = userIdentifier;
    console.log('=== Config Store: Captured User Identifier ===');
    console.log('User Identifier:', userIdentifier);
    console.log('User Defined Data:', userDefinedData);

    // Return a simple action ID
    return 'verify-human';
  }

  async getConfig(_actionId: string): Promise<any> {
    // Return the base verification config
    return this.baseConfig;
  }

  async setConfig(_actionId: string, _config: any): Promise<boolean> {
    // Not needed for our use case, but required by interface
    // In a full implementation, this would store configs for different actions
    return true;
  }
}

/**
 * POST /api/self/verify
 * Verify Self Protocol human verification proof
 * Public endpoint - called by Self Protocol after user completes verification
 */
export async function POST(request: NextRequest) {
  try {
    // Extract verification data from request
    const body = await request.json();
    const { attestationId, proof, publicSignals, userContextData } = body;

    // Validate all required fields are present
    if (!proof || !publicSignals || !attestationId || !userContextData) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing required fields: proof, publicSignals, attestationId, and userContextData are required',
        },
        { status: 400 }
      );
    }

    // Log the incoming data for debugging
    console.log('=== Self Protocol Verification Request ===');
    console.log('Received attestationId, proof, publicSignals, and userContextData');

    // Define verification requirements (must match frontend)
    // CRITICAL: Use direct ISO country codes like "IRN", "PRK" (not constants)
    const verificationConfig = {
      excludedCountries: ['IRN', 'PRK'] as any, // Direct 3-letter ISO codes (typed as any to avoid SDK type conflicts)
      ofac: true,
      minimumAge: 18,
    };

    // Create custom configuration store to capture user identifier
    const configStore = new CustomConfigStore(verificationConfig);

    // Get configuration from environment
    const scope = process.env.NEXT_PUBLIC_SELF_SCOPE!;
    const endpoint = process.env.NEXT_PUBLIC_SELF_ENDPOINT!;

    // Initialize Self Backend Verifier
    // mockPassport: false for production (use true for testing)
    const selfBackendVerifier = new SelfBackendVerifier(
      scope,           // Scope name (must match frontend)
      endpoint,        // API endpoint
      false,          // mockPassport: false for production with real passports
      AllIds,         // Accept all document types (passports, EU ID cards)
      configStore,    // Verification configuration
      'hex'           // userIdType: 'hex' for wallet addresses
    );

    // Verify the proof
    const result = await selfBackendVerifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData
    );

    // CRITICAL: Only check isValidProof (as per requirements)
    // Do NOT check result.isValid - only validate the proof itself
    // Note: Using type assertion as SDK types may vary
    const isValidDetails = result.isValidDetails as any;
    if (isValidDetails?.isValidProof || isValidDetails?.isValid) {
      // Verification successful - get user identifier from config store
      const userAddress = configStore.userIdentifier;

      if (!userAddress) {
        console.error('User identifier not captured by config store');
        return NextResponse.json(
          {
            status: 'error',
            message: 'Failed to extract user identifier from verification',
          },
          { status: 500 }
        );
      }

      console.log('Verification successful for address:', userAddress);

      // Update user profile in KV store
      try {
        // Get existing profile
        const existingProfile = await getProfile(userAddress);

        if (existingProfile) {
          // Update existing profile with verification status
          const updatedProfile = await setProfile(userAddress, {
            name: existingProfile.name,
            bio: existingProfile.bio,
            isVerified: true,
            verifiedAt: Date.now(),
          });

          // Return success response with the saved profile data
          return NextResponse.json({
            status: 'success',
            result: true,
            message: 'Human verification successful',
            credentialSubject: result.discloseOutput,
            verifiedAt: updatedProfile.verifiedAt,
          });
        } else {
          // User doesn't have a profile yet
          // They need to create one first before verifying
          return NextResponse.json(
            {
              status: 'error',
              message: 'No profile found. Please create a profile first.',
            },
            { status: 400 }
          );
        }
      } catch (kvError) {
        console.error('Error updating profile in KV store:', kvError);
        return NextResponse.json(
          {
            status: 'error',
            message: 'Verification succeeded but failed to update profile',
          },
          { status: 500 }
        );
      }
    } else {
      // Verification failed
      console.error('Verification failed:', result.isValidDetails);
      return NextResponse.json(
        {
          status: 'error',
          result: false,
          message: 'Verification failed - proof is invalid',
          details: result.isValidDetails,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying Self Protocol proof:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error during verification',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
