'use client';

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, X, Upload, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCreateOrgRequest } from '@/lib/api/org-requests';
import { useUploadFile } from '@/lib/api/upload';

interface RequestOrgDialogProps {
  onClose: () => void;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function RequestOrgDialog({ onClose }: RequestOrgDialogProps) {
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const createRequest = useCreateOrgRequest();
  const uploadFile = useUploadFile();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadFile.mutateAsync({ file, folder: 'org-requests' });
      setAvatarUrl(result.url);
    } catch {
      setError('Failed to upload avatar.');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadFile.mutateAsync({ file, folder: 'org-requests' });
      setBannerUrl(result.url);
    } catch {
      setError('Failed to upload banner.');
    }
  };

  const handleSubmit = () => {
    if (!orgName.trim()) return;
    setError('');

    createRequest.mutate(
      {
        orgName: orgName.trim(),
        orgDescription: orgDescription.trim() || undefined,
        orgAvatar: avatarUrl,
        orgBannerImage: bannerUrl,
      },
      {
        onSuccess: () => onClose(),
        onError: () => setError('Failed to submit request. Please try again.'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-lg mx-4"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Card className="bg-white border-border/50 border border-border rounded-2xl">
          <CardContent className="p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-primary mb-0.5">
                  Organization Request
                </p>
                <h2 className="text-[20px] text-foreground">Request New Organization</h2>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Org Name */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Organization Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter organization name…"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="h-9 text-[14px] bg-white border-border/60"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Description
                </label>
                <Textarea
                  placeholder="Describe the purpose and goals of the organization…"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  className="min-h-[80px] text-[14px] bg-white border-border/60 resize-none"
                  maxLength={1000}
                />
                <p className="mt-1 text-[12px] text-muted-foreground text-right">
                  {orgDescription.length}/1000
                </p>
              </div>

              {/* Avatar upload */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Avatar (optional)
                </label>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                {avatarUrl ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>{initials(orgName || 'O')}</AvatarFallback>
                    </Avatar>
                    <Button variant="ghost" size="sm" className="text-[13px] text-muted-foreground" onClick={() => setAvatarUrl(null)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-[13px]"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadFile.isPending}
                  >
                    {uploadFile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload Avatar
                  </Button>
                )}
              </div>

              {/* Banner upload */}
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                  Banner Image (optional)
                </label>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                {bannerUrl ? (
                  <div className="space-y-2">
                    <div className="h-24 w-full overflow-hidden rounded-lg border border-border/50">
                      <img src={bannerUrl} alt="Banner preview" className="h-full w-full object-cover" />
                    </div>
                    <Button variant="ghost" size="sm" className="text-[13px] text-muted-foreground" onClick={() => setBannerUrl(null)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-[13px]"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadFile.isPending}
                  >
                    {uploadFile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                    Upload Banner
                  </Button>
                )}
              </div>

              {error && (
                <p className="text-[13px] text-destructive">{error}</p>
              )}
            </div>

            <div className="mt-7 flex justify-end gap-2.5">
              <Button variant="outline" size="default" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                disabled={!orgName.trim() || createRequest.isPending}
                onClick={handleSubmit}
              >
                {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
