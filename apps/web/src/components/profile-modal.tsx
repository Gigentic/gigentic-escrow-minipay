"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/use-profile';
import { useLogout } from '@/hooks/use-logout';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VerificationBadge } from '@/components/verification-badge';
import { SelfVerificationQR } from '@/components/self-verification-qr';
import { Shield } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
}

export function ProfileModal({ open, onOpenChange, address }: ProfileModalProps) {
  const router = useRouter();
  const logout = useLogout();
  const { profile, isLoading, updateProfile, isUpdating, updateError, refetch, deleteProfile, isDeleting, deleteError } = useProfile(address);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<{ name?: string; bio?: string }>({});
  const [showVerificationQR, setShowVerificationQR] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with existing profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const validateForm = () => {
    const newErrors: { name?: string; bio?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
    }

    if (bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    updateProfile(
      { name: name.trim(), bio: bio.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleLogout = async () => {
    onOpenChange(false); // Close modal first
    await logout(); // Uses centralized logout hook (disconnects wallet and redirects)
  };

  const handleVerificationSuccess = () => {
    // Close QR code display
    setShowVerificationQR(false);
    // Refetch profile to get updated verification status
    refetch();
  };

  const handleVerifyClick = () => {
    // If profile doesn't exist yet, save it first
    if (!profile) {
      if (!validateForm()) return;

      updateProfile(
        { name: name.trim(), bio: bio.trim() },
        {
          onSuccess: () => {
            setSaveSuccess(true);
            setShowVerificationQR(true);
            // Hide success message after 3 seconds
            setTimeout(() => setSaveSuccess(false), 3000);
          },
        }
      );
    } else {
      // Profile exists, just show verification
      setShowVerificationQR(true);
    }
  };

  const handleDeleteConfirm = async () => {
    deleteProfile(undefined, {
      onSuccess: async () => {
        // Close modal
        onOpenChange(false);
        // Logout user
        await logout();
        // Redirect to homepage
        router.push('/');
      },
    });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="overflow-y-auto max-h-[90vh]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Profile Settings</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {/* Update your profile information. This will be visible to others when you create or participate in escrows. */}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid gap-4 py-4">
          {/* Wallet Address Display */}
          {/* <div className="grid gap-2">
            <Label htmlFor="address">Wallet Address</Label>
            <div className="text-sm text-muted-foreground font-mono truncate">
              {address}
            </div>
          </div> */}

          {/* Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder="Enter your name"
              maxLength={50}
              disabled={isUpdating}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {name.length}/50 characters
            </p>
          </div>

          {/* Bio Textarea */}
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                if (errors.bio) setErrors({ ...errors, bio: undefined });
              }}
              placeholder="Describe the goods and services you offer..."
              rows={4}
              maxLength={500}
              disabled={isUpdating}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {bio.length}/500 characters
            </p>
            {saveSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Profile saved
              </p>
            )}
          </div>

          {/* Verification Section */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              Human Verification
            </Label>

            {profile?.isVerified ? (
              // Show verification badge if verified
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <VerificationBadge
                  isVerified={profile.isVerified}
                  verifiedAt={profile.verifiedAt}
                  size="sm"
                />
              </div>
            ) : showVerificationQR ? (
              // Show QR code inline when button is clicked
              <SelfVerificationQR
                onSuccess={handleVerificationSuccess}
                onClose={() => setShowVerificationQR(false)}
              />
            ) : (
              // Show verification button if not verified
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Verify your humanity to build trust with other users
                </p>
                <Button
                  onClick={handleVerifyClick}
                  variant="outline"
                  className="w-full"
                  disabled={!name.trim() || isUpdating}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Saving...' : 'Verify Humanity'}
                </Button>
              </div>
            )}
          </div>

          {/* Update Error Display */}
          {updateError && (
            <div className="text-sm text-destructive">
              {updateError.message || 'Failed to update profile'}
            </div>
          )}

          {/* Delete Error Display */}
          {deleteError && (
            <div className="text-sm text-destructive">
              {deleteError.message || 'Failed to delete profile'}
            </div>
          )}
        </div>

        <ResponsiveDialogFooter className="gap-2 sm:justify-between">
          {!showDeleteConfirm ? (
            <>
              {/* Left side buttons - Delete Profile (desktop) / bottom (mobile) */}
              <div className="flex gap-2 sm:order-1 order-3 w-1/2 sm:w-auto">
                {profile && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isUpdating || isDeleting}
                    className="w-full sm:w-auto"
                  >
                    Delete Profile
                  </Button>
                )}
              </div>

              {/* Right side buttons - Sign Out and Save Changes */}
              <div className="flex gap-2 sm:order-2 order-1 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isUpdating || isDeleting}
                  className="flex-1 sm:flex-initial"
                >
                  Sign Out
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isUpdating || isLoading || isDeleting}
                  className="flex-1 sm:flex-initial"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 sm:flex-initial"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
