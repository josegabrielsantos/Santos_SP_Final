'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import { useUpdateProfile } from '@/lib/api/users';
import { useUploadFile } from '@/lib/api/upload';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, Settings, X, Plus } from 'lucide-react';

function initials(name: string) {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function SettingsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const updateProfile = useUpdateProfile();
  const uploadFile = useUploadFile();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newExpertise, setNewExpertise] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  // Initialize form from user data
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? '');
    setBio(user.bio ?? '');
    setAvatarUrl(user.avatar ?? null);
    setExpertise(user.expertise ?? []);
    setCertifications(user.certifications ?? []);
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile.mutateAsync({ file, folder: 'avatars' });
    setAvatarUrl(result.url);
  };

  const handleAddExpertise = () => {
    const val = newExpertise.trim();
    if (!val || expertise.includes(val)) return;
    setExpertise([...expertise, val]);
    setNewExpertise('');
  };

  const handleRemoveExpertise = (item: string) => {
    setExpertise(expertise.filter((e) => e !== item));
  };

  const handleAddCertification = () => {
    const val = newCertification.trim();
    if (!val || certifications.includes(val)) return;
    setCertifications([...certifications, val]);
    setNewCertification('');
  };

  const handleRemoveCertification = (item: string) => {
    setCertifications(certifications.filter((c) => c !== item));
  };

  const handleSave = () => {
    if (!user) return;
    updateProfile.mutate(
      {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || null,
        avatar: avatarUrl,
        expertise,
        certifications,
      },
      {
        onSuccess: (data) => {
          // Update Redux auth state so the navbar/avatar refreshes immediately
          dispatch(
            setUser({
              ...user,
              displayName: data.displayName,
              bio: data.bio,
              avatar: data.avatar,
              expertise: data.expertise,
              certifications: data.certifications,
            })
          );

          if (successTimer.current) clearTimeout(successTimer.current);
          setSuccessMsg('Profile updated successfully.');
          successTimer.current = setTimeout(() => setSuccessMsg(''), 3000);
        },
      }
    );
  };

  if (!user) return null;

  return (
    <AuthenticatedLayout>
      <div className="w-full max-w-2xl px-5 py-7 lg:px-7 mx-auto">
        <div className="mb-6 flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="font-heading text-[22px] font-bold text-foreground">Settings</h1>
        </div>

        <div className="flex flex-col gap-6">
          {/* Profile Picture */}
          <Card className="border-border/60 bg-white">
            <CardContent className="p-6">
              <h2 className="mb-4 text-[16px] font-semibold text-foreground">Profile Picture</h2>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary text-[22px] font-bold text-white">
                    {initials(displayName || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={uploadFile.isPending}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {uploadFile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload photo
                    </Button>
                    {avatarUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setAvatarUrl(null)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">JPG, PNG, or GIF. Max 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* General Info */}
          <Card className="border-border/60 bg-white">
            <CardContent className="p-6">
              <h2 className="mb-4 text-[16px] font-semibold text-foreground">General</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                    Display name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="text-[15px]"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                    Email
                  </label>
                  <Input
                    value={user.email}
                    disabled
                    className="text-[15px] bg-muted/30 text-muted-foreground cursor-not-allowed"
                  />
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Email is managed by your Google account and cannot be changed here.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    placeholder="Tell others about yourself and your research interests"
                    rows={4}
                    maxLength={500}
                    className="w-full resize-none rounded-md border border-border/80 bg-background px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="mt-1 text-right text-[13px] text-muted-foreground">
                    {bio.length}/500
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expertise */}
          <Card className="border-border/60 bg-white">
            <CardContent className="p-6">
              <h2 className="mb-1 text-[16px] font-semibold text-foreground">Expertise</h2>
              <p className="mb-4 text-[13px] text-muted-foreground">
                Add your areas of expertise or research focus.
              </p>

              {expertise.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {expertise.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-medium text-primary"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveExpertise(item)}
                        className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newExpertise}
                  onChange={(e) => setNewExpertise(e.target.value)}
                  placeholder="e.g., Food Security, Nutrition Policy"
                  className="text-[14px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExpertise();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={handleAddExpertise}
                  disabled={!newExpertise.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card className="border-border/60 bg-white">
            <CardContent className="p-6">
              <h2 className="mb-1 text-[16px] font-semibold text-foreground">Certifications</h2>
              <p className="mb-4 text-[13px] text-muted-foreground">
                List your academic degrees, certifications, or credentials.
              </p>

              {certifications.length > 0 && (
                <div className="mb-3 flex flex-col gap-2">
                  {certifications.map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <span className="text-[14px] text-foreground">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCertification(item)}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="e.g., PhD in Food Science, MS in Nutrition"
                  className="text-[14px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCertification();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={handleAddCertification}
                  disabled={!newCertification.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex items-center justify-between">
            {successMsg ? (
              <p className="text-[14px] font-medium text-green-600">{successMsg}</p>
            ) : (
              <span />
            )}
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending || !displayName.trim()}
              className="gap-2"
            >
              {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
