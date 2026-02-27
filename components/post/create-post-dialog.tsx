'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePost } from '@/lib/api/posts';
import { useUploadFile } from '@/lib/api/upload';
import { useOrganizations } from '@/lib/api/organizations';
import { useAppSelector } from '@/store/hooks';
import type { PostType } from '@/lib/types';
import {
  Plus,
  X,
  ImagePlus,
  BarChart3,
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
  Trash2,
  FileText,
} from 'lucide-react';

// generate a short unique id for poll options
function optionId() {
  return Math.random().toString(36).slice(2, 10);
}

interface PostFormValues {
  title: string;
  type: PostType;
  organizationId: string;
  tags: string;
  pollQuestion: string;
  pollIsMultiple: boolean;
  pollOptions: { id: string; text: string }[];
}

export function CreatePostDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const createPost = useCreatePost();
  const uploadFile = useUploadFile();
  const { data: orgsData } = useOrganizations({ limit: 100 });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<PostFormValues>({
    defaultValues: {
      title: '',
      type: 'post',
      organizationId: 'personal',
      tags: '',
      pollQuestion: '',
      pollIsMultiple: false,
      pollOptions: [
        { id: optionId(), text: '' },
        { id: optionId(), text: '' },
      ],
    },
  });

  const { fields: pollFields, append: addPollOption, remove: removePollOption } = useFieldArray({
    control,
    name: 'pollOptions',
  });

  const selectedType = watch('type');

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
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
      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of Array.from(files)) {
          const result = await uploadFile.mutateAsync({ file, folder: 'posts' });
          urls.push(result.url);
        }
        setMediaUrls((prev) => [...prev, ...urls]);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [uploadFile]
  );

  const removeMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (values: PostFormValues) => {
    const bodyJson = editor?.getJSON() ?? null;
    const bodyText = editor?.getText() ?? '';

    const tags = values.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const poll =
      selectedType === 'poll'
        ? {
            question: values.pollQuestion,
            isMultiple: values.pollIsMultiple,
            options: values.pollOptions
              .filter((o) => o.text.trim())
              .map((o) => ({ optionId: o.id, text: o.text.trim() })),
            closesAt: null,
          }
        : null;

    await createPost.mutateAsync({
      title: values.title,
      body: bodyJson,
      bodyText,
      tags,
      organizationId: values.organizationId === 'personal' ? null : values.organizationId,
      type: values.type,
      status: 'published',
      mediaUrls,
      poll,
    });

    // Reset form
    reset();
    editor?.commands.clearContent();
    setMediaUrls([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Give your post a title…"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Post type + Org selector row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Post Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="poll">Poll</SelectItem>
                      <SelectItem value="paper_share">Paper Share</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Organization</Label>
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Personal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      {orgsData?.organizations?.map((org) => (
                        <SelectItem key={org._id} value={org._id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Rich-text body */}
          <div className="flex flex-col gap-1.5">
            <Label>Body</Label>
            {/* Toolbar */}
            {editor && (
              <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-border bg-muted/30 px-2 py-1.5">
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
                <ToolbarBtn
                  icon={Undo}
                  onClick={() => editor.chain().focus().undo().run()}
                />
                <ToolbarBtn
                  icon={Redo}
                  onClick={() => editor.chain().focus().redo().run()}
                />
              </div>
            )}
            <div className="rounded-b-md border border-border">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Poll section */}
          {selectedType === 'poll' && (
            <div className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <Label>Poll</Label>
              </div>
              <Input
                placeholder="Poll question…"
                {...register('pollQuestion', {
                  validate: (v) =>
                    selectedType !== 'poll' || v.trim().length > 0 || 'Poll question is required',
                })}
              />
              {errors.pollQuestion && (
                <p className="text-xs text-destructive">{errors.pollQuestion.message}</p>
              )}

              <div className="flex flex-col gap-2">
                {pollFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      {...register(`pollOptions.${idx}.text` as const)}
                      className="flex-1"
                    />
                    {pollFields.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removePollOption(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollFields.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit gap-1.5 text-xs"
                    onClick={() => addPollOption({ id: optionId(), text: '' })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add option
                  </Button>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('pollIsMultiple')} className="rounded" />
                Allow multiple choices
              </label>
            </div>
          )}

          {/* Media uploads */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Label>Media</Label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {uploading ? 'Uploading…' : 'Add images / videos / PDFs'}
                </span>
              </label>
            </div>
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediaUrls.map((url, idx) => (
                  <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border">
                    {url.match(/\.pdf$/i) ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-muted/30 text-muted-foreground">
                        <FileText className="h-6 w-6" />
                        <span className="mt-0.5 text-[9px]">PDF</span>
                      </div>
                    ) : url.match(/\.(mp4|webm|mov|avi)$/i) ? (
                      <video src={url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(idx)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="Comma-separated, e.g. nutrition, research, policy"
              {...register('tags')}
            />
          </div>

          <Separator />

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createPost.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={createPost.isPending}
            >
              {createPost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish
            </Button>
          </div>
        </form>
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
      className={`rounded p-1 transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
