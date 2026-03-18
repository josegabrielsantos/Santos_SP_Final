'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthenticatedNavbar } from '@/components/layout/authenticated-navbar';
import { Sidebar } from '@/components/layout/sidebar';
import { useOrganization, useUpdateOrg } from '@/lib/api/organizations';
import { useUploadFile } from '@/lib/api/upload';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, Settings } from 'lucide-react';

function initials(name: string) {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function OrgSettingsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const userId = user?._id;

  const { data: org, isLoading: orgLoading } = useOrganization(slug);
  const updateOrg = useUpdateOrg();
  const uploadFile = useUploadFile();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!org) return;
    setName(org.name ?? '');
    setDescription(org.description ?? '');
    setWelcomeMessage(org.welcomeMessage ?? '');
    setAvatarUrl(org.avatar ?? null);
    setBannerUrl(org.bannerImage ?? null);
  }, [org]);

  useEffect(() => {
    if (!org || !userId) return;
    const isOwner = org.ownerId?._id === userId;
    const isAdmin = org.adminIds.some((a) => a._id === userId);
    if (!isOwner && !isAdmin) {
      router.replace(`/organizations/${slug}`);
    }
  }, [org, userId, slug, router]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile.mutateAsync({ file, folder: 'org-avatars' });
    setAvatarUrl(result.url);
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile.mutateAsync({ file, folder: 'org-banners' });
    setBannerUrl(result.url);
  };

  const handleSave = () => {
    if (!org?._id) return;
    updateOrg.mutate(
      {
        orgId: org._id,
        payload: {
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          welcomeMessage: welcomeMessage.trim() || null,
          avatar: avatarUrl,
          bannerImage: bannerUrl,
        },
      },
      {
        onSuccess: () => {
          if (successTimer.current) clearTimeout(successTimer.current);
          setSuccessMsg('Settings saved successfully.');
          successTimer.current = setTimeout(() => setSuccessMsg(''), 3000);
        },
      }
    );
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-page-bg">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-page-bg">
        <AuthenticatedNavbar />
        <div className="flex justify-center py-20">
          <p className="text-muted-foreground">Organization not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <AuthenticatedNavbar />

      <div className="flex">
        <Sidebar />

        <main className="flex flex-1 justify-center">
          <div className="w-full max-w-2xl px-5 py-7 lg:px-7">
            <div className="mb-6 flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-[22px] font-bold text-foreground">Organization Settings</h1>
            </div>

            <div className="flex flex-col gap-6">
              {/* General */}
              <Card className="border-border/60 bg-white ">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-[16px] font-semibold text-foreground">General</h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                        Organization name
                      </label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Organization name"
                        className="text-[15px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Short description of your organization"
                        rows={3}
                        maxLength={1000}
                        className="w-full resize-none rounded-md border border-border/80 bg-background px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[14px] font-medium text-foreground">
                        Welcome message
                      </label>
                      <textarea
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value.slice(0, 500))}
                        placeholder="A message shown to visitors on your org page"
                        rows={3}
                        maxLength={500}
                        className="w-full resize-none rounded-md border border-border/80 bg-background px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="mt-1 text-right text-[13px] text-muted-foreground">
                        {welcomeMessage.length}/500
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branding */}
              <Card className="border-border/60 bg-white ">
                <CardContent className="p-6">
                  <h2 className="mb-4 text-[16px] font-semibold text-foreground">Branding</h2>
                  <div className="flex flex-col gap-6">
                    {/* Avatar */}
                    <div>
                      <label className="mb-2 block text-[14px] font-medium text-foreground">Avatar</label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 ring-2 ring-border">
                          <AvatarImage src={avatarUrl ?? undefined} alt={org.name} />
                          <AvatarFallback className="bg-primary/10 text-[20px] font-bold text-primary">
                            {initials(org.name)}
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
                            Upload avatar
                          </Button>
                          <p className="mt-1 text-[12px] text-muted-foreground">JPG, PNG, GIF up to 5MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Banner */}
                    <div>
                      <label className="mb-2 block text-[14px] font-medium text-foreground">Banner image</label>
                      {bannerUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bannerUrl}
                          alt="Banner preview"
                          className="mb-3 h-28 w-full rounded-lg object-cover border border-border/60"
                        />
                      )}
                      <div>
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBannerChange}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={uploadFile.isPending}
                          onClick={() => bannerInputRef.current?.click()}
                        >
                          {uploadFile.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload banner
                        </Button>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          Recommended: 1500x500px. JPG, PNG up to 5MB
                        </p>
                      </div>
                    </div>
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
                  disabled={updateOrg.isPending || !name.trim()}
                  className="gap-2"
                >
                  {updateOrg.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
