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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePost, useParsePdf } from '@/lib/api/posts';
import { useUploadFile } from '@/lib/api/upload';
import { useOrganizations } from '@/lib/api/organizations';
import { useAppSelector } from '@/store/hooks';
import type { PostType, PaperMetadata } from '@/lib/types';
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
  Hash,
  Upload,
  BookOpen,
  AlertCircle,
} from 'lucide-react';

// generate a short unique id for poll options
function optionId() {
  return Math.random().toString(36).slice(2, 10);
}

interface PostFormValues {
  title: string;
  type: PostType;
  organizationId: string;
  pollQuestion: string;
  pollIsMultiple: boolean;
  pollOptions: { id: string; text: string }[];
}

export function CreatePostDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>(['']);
  const [paperMeta, setPaperMeta] = useState<PaperMetadata | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const createPost = useCreatePost();
  const uploadFile = useUploadFile();
  const parsePdf = useParsePdf();
  const { data: orgsData } = useOrganizations({ limit: 100 });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<PostFormValues>({
    defaultValues: {
      title: '',
      type: 'post',
      organizationId: 'personal',
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

      // For non-paper_share posts, enforce document file limit (max 5)
      if (selectedType !== 'paper_share') {
        const currentDocCount = mediaUrls.filter(
          (u) => !/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi|mkv)$/i.test(u)
        ).length;
        const newDocCount = Array.from(files).filter(
          (f) => !f.type.startsWith('image/') && !f.type.startsWith('video/')
        ).length;
        if (currentDocCount + newDocCount > 5) {
          alert('Maximum 5 document files (PDFs, etc.) allowed per post. Images and videos are unlimited.');
          e.target.value = '';
          return;
        }
      }

      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of Array.from(files)) {
          const result = await uploadFile.mutateAsync({ file, folder: 'posts' });
          urls.push(result.url);
        }
        setMediaUrls((prev) => [...prev, ...urls]);

        // Auto-parse first PDF for paper_share posts
        if (selectedType === 'paper_share' && !paperMeta) {
          const firstPdf = urls.find((u) => /\.pdf$/i.test(u));
          if (firstPdf) {
            setParsingPdf(true);
            try {
              const meta = await parsePdf.mutateAsync(firstPdf);
              setPaperMeta(meta);
              // Auto-fill title if empty
              if (!getValues('title') && meta.title) {
                setValue('title', meta.title);
              }
              // Auto-fill tags from keywords
              if (meta.keywords?.length > 0) {
                setTags((prev) => {
                  const existing = prev.filter((t) => t.trim());
                  if (existing.length === 0 || (existing.length === 1 && !existing[0])) {
                    return meta.keywords.slice(0, 10);
                  }
                  return prev;
                });
              }
            } catch {
              // Parsing failed - not critical
            } finally {
              setParsingPdf(false);
            }
          }
        }
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uploadFile, selectedType, mediaUrls, paperMeta, parsePdf, getValues, setValue]
  );

  const removeMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Tag management ────────────────────
  const addTag = () => {
    if (tags.length < 10) {
      setTags((prev) => [...prev, '']);
    }
  };

  const removeTag = (idx: number) => {
    setTags((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTag = (idx: number, value: string) => {
    setTags((prev) => prev.map((t, i) => (i === idx ? value : t)));
  };

  const onSubmit = async (values: PostFormValues) => {
    const bodyJson = editor?.getJSON() ?? null;
    const bodyText = editor?.getText() ?? '';

    const cleanTags = tags.map((t) => t.trim()).filter(Boolean);

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
      tags: cleanTags,
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
    setTags(['']);
    setPaperMeta(null);
    setParsingPdf(false);
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
          <DialogTitle className="flex items-center gap-2 text-lg">
            Create Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Post type + Org selector row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Post Type</Label>
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
              <Label className="text-xs font-medium text-muted-foreground">Organization</Label>
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

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
              Title *
            </Label>
            <Input
              id="title"
              placeholder="Give your post a title…"
              className="text-base font-medium"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Rich-text body */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Body</Label>
            {/* Toolbar */}
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
            <div className="rounded-b-lg border border-border transition-colors focus-within:border-primary/50">
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Paper Share – Auto-parsed PDF metadata */}
          {selectedType === 'paper_share' && (
            <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/30 p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <Label className="font-semibold text-blue-900">Research Paper</Label>
              </div>
              <p className="text-xs text-blue-700/80">
                Upload a PDF and we&apos;ll automatically extract paper metadata (title, authors, keywords).
              </p>

              {parsingPdf && (
                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-white p-3 text-sm text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting metadata from PDF…
                </div>
              )}

              {parsePdf.isError && !parsingPdf && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Could not extract metadata from this PDF. You can fill in details manually.
                </div>
              )}

              {paperMeta && !parsingPdf && (
                <div className="rounded-md border border-blue-200 bg-white p-3">
                  {paperMeta.title && (
                    <h4 className="text-sm font-semibold text-foreground line-clamp-2">{paperMeta.title}</h4>
                  )}
                  {paperMeta.authors.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paperMeta.authors.join(', ')}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {paperMeta.year && (
                      <span className="rounded bg-muted px-1.5 py-0.5">{paperMeta.year}</span>
                    )}
                    {paperMeta.pageCount && (
                      <span className="rounded bg-muted px-1.5 py-0.5">{paperMeta.pageCount} pages</span>
                    )}
                  </div>
                  {paperMeta.abstract && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{paperMeta.abstract}</p>
                  )}
                  {paperMeta.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {paperMeta.keywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-[10px]">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-blue-600/70">
                    Title and tags were auto-filled from this PDF.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Poll section */}
          {selectedType === 'poll' && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <Label className="font-semibold">Poll</Label>
              </div>
              <Input
                placeholder="What would you like to ask?"
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
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-white text-xs text-muted-foreground">
                      {idx + 1}
                    </div>
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      {...register(`pollOptions.${idx}.text` as const)}
                      className="flex-1"
                    />
                    {pollFields.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removePollOption(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
                <input type="checkbox" {...register('pollIsMultiple')} className="rounded border-border" />
                Allow multiple choices
              </label>
            </div>
          )}

          {/* Media uploads */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground">Attachments</Label>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-primary">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading…' : 'Click to upload files (images, videos, PDFs, etc.)'}
              </div>
            </label>
            {selectedType !== 'paper_share' && (
              <p className="text-[11px] text-muted-foreground/70">
                Images &amp; videos: unlimited · Documents/PDFs: max 5 per post
              </p>
            )}
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediaUrls.map((url, idx) => (
                  <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-border">
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
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags – Individual inputs */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Tags {tags.filter((t) => t.trim()).length > 0 && (
                  <span className="text-muted-foreground/60">({tags.filter((t) => t.trim()).length}/10)</span>
                )}
              </Label>
              {tags.length < 10 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-primary hover:text-primary/80"
                  onClick={addTag}
                >
                  <Plus className="h-3 w-3" />
                  Add Tag
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="relative">
                    <Hash className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      value={tag}
                      onChange={(e) => updateTag(idx, e.target.value)}
                      placeholder="tag name"
                      className="h-8 w-36 pl-7 text-xs"
                    />
                  </div>
                  {tags.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTag(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
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
      className={`rounded-md p-1.5 transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
