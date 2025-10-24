import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { setProfile, getProfile } from '@/lib/kv';

/**
 * POST /api/profile
 * Update or create user profile
 * Requires authentication - user can only update their own profile
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // @ts-ignore - address is added in the session callback
    const userAddress = session.user.address as string | undefined;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'No wallet address found in session' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, bio } = body;

    // Validate input
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof bio !== 'string') {
      return NextResponse.json(
        { error: 'Bio must be a string' },
        { status: 400 }
      );
    }

    // Validate length constraints
    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be 50 characters or less' },
        { status: 400 }
      );
    }

    if (bio.length > 500) {
      return NextResponse.json(
        { error: 'Bio must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Save profile
    await setProfile(userAddress, {
      name: name.trim(),
      bio: bio.trim(),
    });

    // Fetch and return the updated profile
    const updatedProfile = await getProfile(userAddress);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
