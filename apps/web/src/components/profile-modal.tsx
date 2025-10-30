"use client";

import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { useLogout } from '@/hooks/use-logout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const logout = useLogout();
  const { profile, isLoading, updateProfile, isUpdating, updateError, refetch } = useProfile(address);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<{ name?: string; bio?: string }>({});
  const [showVerificationQR, setShowVerificationQR] = useState(false);

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
    await logout(); // Uses centralized logout hook
    onOpenChange(false);
  };

  const handleVerificationSuccess = () => {
    // Close QR code display
    setShowVerificationQR(false);
    // Refetch profile to get updated verification status
    refetch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            {/* Update your profile information. This will be visible to others when you create or participate in escrows. */}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Wallet Address Display */}
          {/* <div className="grid gap-2">
            <Label htmlFor="address">Wallet Address</Label>
            <div className="text-sm text-muted-foreground font-mono truncate">
              {address}
            </div>
          </div> */}

          {/* Verification Section */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
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
                  onClick={() => setShowVerificationQR(true)}
                  variant="outline"
                  className="w-full"
                  disabled={!profile}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Verify Humanity
                </Button>
                {!profile && (
                  <p className="text-xs text-muted-foreground">
                    Please save your profile first before verifying
                  </p>
                )}
              </div>
            )}
          </div>

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
          </div>

          {/* Update Error Display */}
          {updateError && (
            <div className="text-sm text-destructive">
              {updateError.message || 'Failed to update profile'}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isUpdating}
          >
            Logout
          </Button>
          <Button onClick={handleSave} disabled={isUpdating || isLoading}>
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
