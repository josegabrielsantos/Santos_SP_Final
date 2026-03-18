'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCreatePost } from '@/lib/api/posts';
import { useUploadFile, useDeleteUploadedFile } from '@/lib/api/upload';
import {
  Megaphone,
  X,
  ImagePlus,
  Send,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
  Loader2,
  Upload,
  AlertCircle,
} from 'lucide-react';

interface CreateAnnouncementDialogProps {
  children: React.ReactNode;
}

export function CreateAnnouncementDialog({ children }: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const createPost = useCreatePost();
  const uploadFile = useUploadFile();
  const deleteUploadedFile = useDeleteUploadedFile();

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[120px] outline-none px-3 py-2',
      },
    },
  });

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;

      // Only allow images and videos for announcements
      const allowed = Array.from(files).filter(
        (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
      );

      if (allowed.length !== files.length) {
        setError('Only images and videos are allowed for announcements.');
      }

      if (!allowed.length) {
        e.target.value = '';
        return;
      }

      setUploading(true);
      try {
        for (const file of allowed) {
          const result = await uploadFile.mutateAsync({ file, folder: 'posts' });
          setMediaUrls((prev) => [...prev, result.url]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setError('Failed to upload file. Please try again.');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    [uploadFile]
  );

  const removeMedia = async (idx: number) => {
    const removed = mediaUrls[idx];
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
    try {
      await deleteUploadedFile.mutateAsync({ url: removed });
    } catch {
      // ignore
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const bodyJson = editor?.getJSON() ?? null;
    const bodyText = editor?.getText() ?? '';

    try {
      await createPost.mutateAsync({
        title: title.trim(),
        body: bodyJson,
        bodyText,
        tags: [],
        organizationId: null,
        type: 'announcement',
        status: 'published',
        mediaUrls,
        poll: null,
        paperMetadata: null,
      });

      // Reset form
      setTitle('');
      editor?.commands.clearContent();
      setMediaUrls([]);
      setError('');
      setOpen(false);
    } catch {
      setError('Failed to publish announcement. Please try again.');
    }
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      // Clean up uploaded media if cancelling
      for (const url of mediaUrls) {
        try {
          await deleteUploadedFile.mutateAsync({ url });
        } catch {
          // ignore
        }
      }
      setMediaUrls([]);
      setTitle('');
      setError('');
      editor?.commands.clearContent();
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-amber-600" />
            Create Announcement
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Info notice */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5 text-[14px] text-amber-800">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              This announcement will be published immediately and <strong>all users will be notified</strong>.
              Announcements are time-sensitive — remember to delete outdated ones.
            </p>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-title" className="text-[14px] font-medium text-muted-foreground">
              Title *
            </Label>
            <Input
              id="ann-title"
              placeholder="Announcement title…"
              className="text-[18px] font-medium"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Rich text body */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[14px] font-medium text-muted-foreground">Body</Label>
            {editor && (
              <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-border bg-muted/30 px-2 py-1.5">
                <ToolbarBtn
                  icon={Bold}
                  active={editor.isActive('bold')}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                />
                <ToolbarBtn
                  icon={Italic}
                  active={editor.isActive('italic')}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                />
                <ToolbarBtn
                  icon={Heading2}
                  active={editor.isActive('heading', { level: 2 })}
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                />
                <ToolbarBtn
                  icon={List}
                  active={editor.isActive('bulletList')}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                />
                <ToolbarBtn
                  icon={ListOrdered}
                  active={editor.isActive('orderedList')}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                />
                <ToolbarBtn
                  icon={Quote}
                  active={editor.isActive('blockquote')}
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                />
                <Separator orientation="vertical" className="mx-1 h-5" />
                <ToolbarBtn icon={Undo} onClick={() => editor.chain().focus().undo().run()} />
                <ToolbarBtn icon={Redo} onClick={() => editor.chain().focus().redo().run()} />
              </div>
            )}
            <div className="rounded-b-lg border border-border transition-colors focus-within:border-primary/50">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Media uploads — images/videos only */}
          <div className="flex flex-col gap-2">
            <Label className="text-[14px] font-medium text-muted-foreground">Images / Videos</Label>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-[16px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-primary">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading…' : 'Click to upload images or videos'}
              </div>
            </label>
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediaUrls.map((url, idx) => (
                  <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                    {url.match(/\.(mp4|webm|mov|avi)$/i) ? (
                      <video src={url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[14px] text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={createPost.isPending}>
              Cancel
            </Button>
            <Button
              className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
              onClick={handleSubmit}
              disabled={createPost.isPending}
            >
              {createPost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish Announcement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarBtn({
  icon: Icon,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
