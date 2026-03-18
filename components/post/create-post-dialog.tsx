'use client';

import { useState, useCallback, useRef } from 'react';
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
import { useEnrichDoi } from '@/lib/api/papers';
import { useUploadFile, useDeleteUploadedFile } from '@/lib/api/upload';
import { useAppSelector } from '@/store/hooks';
import { useUserOrganizations } from '@/lib/api/users';
import type { PostType, PaperMetadataInput } from '@/lib/types';
import {
  Plus,
  X,
  Clock,
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
  UserPlus,
  Sparkles,
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

interface CreatePostDialogProps {
  children?: React.ReactNode;
  defaultOrgId?: string;
}

export function CreatePostDialog({ children, defaultOrgId }: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>(['']);

  // Paper metadata fields (user-provided for research_paper)
  const [paperAuthors, setPaperAuthors] = useState<string[]>(['']);
  const [paperResearchTitle, setPaperResearchTitle] = useState('');
  const [paperJournal, setPaperJournal] = useState('');
  const [paperDoi, setPaperDoi] = useState('');
  const [paperIsbn, setPaperIsbn] = useState('');
  const [paperAbstract, setPaperAbstract] = useState('');
  const [paperDatePublished, setPaperDatePublished] = useState('');

  // AI paper parsing state
  const [paperPdfUrl, setPaperPdfUrl] = useState<string | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [paperMetadataLoaded, setPaperMetadataLoaded] = useState(false);
  const [parseError, setParseError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const user = useAppSelector((s) => s.auth.user);
  const createPost = useCreatePost();
  const uploadFile = useUploadFile();
  const deleteUploadedFile = useDeleteUploadedFile();
  const parsePdf = useParsePdf();
  const enrichDoi = useEnrichDoi();
  const { data: userOrgs } = useUserOrganizations(user?._id);

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
      organizationId: defaultOrgId || 'personal',
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
  const skipTempCleanupOnCloseRef = useRef(false);

  const isTempUrl = useCallback((url: string) => /\/temp\//i.test(url), []);

  const cleanupTempUploads = useCallback(async () => {
    const tempUrls = mediaUrls.filter(isTempUrl);
    if (!tempUrls.length) return;

    await Promise.allSettled(
      tempUrls.map((url) => deleteUploadedFile.mutateAsync({ url }))
    );
  }, [mediaUrls, isTempUrl, deleteUploadedFile]);

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

      const selectedFiles = Array.from(files);
      const selectedPdfFiles = selectedFiles.filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
      const existingPdfCount = mediaUrls.filter((u) => /\.pdf$/i.test(u)).length;

      // Research paper posts can only have one PDF at a time.
      if (selectedType === 'research_paper') {
        if (selectedPdfFiles.length > 1) {
          setSubmitError('Only one research paper PDF can be uploaded. Please select a single PDF file.');
          e.target.value = '';
          return;
        }

        if (selectedPdfFiles.length === 1 && existingPdfCount > 0) {
          setSubmitError('A research paper PDF is already uploaded. Remove it first before uploading a new one.');
          e.target.value = '';
          return;
        }
      }

      // For non-research_paper posts, enforce document file limit (max 5)
      if (selectedType !== 'research_paper') {
        const currentDocCount = mediaUrls.filter(
          (u) => !/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi|mkv)$/i.test(u)
        ).length;
        const newDocCount = selectedFiles.filter(
          (f) => !f.type.startsWith('image/') && !f.type.startsWith('video/')
        ).length;
        if (currentDocCount + newDocCount > 5) {
          setSubmitError('Maximum 5 document files (PDFs, etc.) allowed per post. Images and videos are unlimited.');
          e.target.value = '';
          return;
        }
      }

      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of selectedFiles) {
          const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
          const folder = selectedType === 'research_paper' && isPdf ? 'temp' : 'posts';
          const result = await uploadFile.mutateAsync({ file, folder });
          urls.push(result.url);
        }
        setMediaUrls((prev) => [...prev, ...urls]);

        // For research papers, auto-parse PDF on every new PDF upload/re-upload.
        if (selectedType === 'research_paper') {
          const pdfUrl = urls.find((u) => /\.pdf/i.test(u));
          if (pdfUrl) {
            setPaperPdfUrl(pdfUrl);
            setParsingPdf(true);
            setParseError('');
            try {
              const metadata = await parsePdf.mutateAsync(pdfUrl);
              console.log('[CreatePostDialog][parsePdf] success', {
                pdfUrl,
                requestId: (metadata as { requestId?: string }).requestId,
                ai: (metadata as { ai?: unknown }).ai,
                debug: (metadata as { debug?: unknown }).debug,
              });
              // Auto-fill paper metadata
              if (metadata.title) setPaperResearchTitle(metadata.title);
              if (metadata.authors?.length) {
                setPaperAuthors(metadata.authors.length > 0 ? metadata.authors : ['']);
              }
              if (metadata.abstract) setPaperAbstract(metadata.abstract);
              if (metadata.journal) setPaperJournal(metadata.journal);
              if (metadata.doi) setPaperDoi(metadata.doi);
              if (metadata.year) setPaperDatePublished(`${metadata.year}-01-01`);
              // Auto-fill keywords into tags
              if (metadata.keywords?.length) {
                setTags((prev) => {
                  const existing = prev.filter((t) => t.trim());
                  const newKws = metadata.keywords.filter((k) => !existing.includes(k));
                  return [...existing, ...newKws].length > 0 ? [...existing, ...newKws] : [''];
                });
              }
              setParseError('');
              setPaperMetadataLoaded(true);
            } catch (err: unknown) {
              const axiosLike = err as {
                response?: {
                  status?: number;
                  data?: {
                    error?: string;
                    requestId?: string;
                    debug?: unknown;
                  };
                };
                message?: string;
              };

              const errorMsg =
                typeof err === 'object' && err !== null && 'response' in err
                  ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
                  : undefined;

              const requestId = axiosLike.response?.data?.requestId;
              console.error('[CreatePostDialog][parsePdf] failed', {
                pdfUrl,
                message: axiosLike.message,
                status: axiosLike.response?.status,
                requestId,
                error: axiosLike.response?.data?.error,
                debug: axiosLike.response?.data?.debug,
              });

              setParseError(
                requestId
                  ? `${errorMsg || 'Could not extract metadata from the PDF. Please fill in the details manually.'} (requestId: ${requestId})`
                  : errorMsg || 'Could not extract metadata from the PDF. Please fill in the details manually.'
              );
              setPaperMetadataLoaded(true);
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
    [uploadFile, selectedType, mediaUrls, parsePdf]
  );

  const removeMedia = async (idx: number) => {
    const removedUrl = mediaUrls[idx];
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));

    if (removedUrl && isTempUrl(removedUrl)) {
      try {
        await deleteUploadedFile.mutateAsync({ url: removedUrl });
      } catch (err) {
        console.error('Failed to delete temp upload:', err);
      }
    }

    // If the removed file is the paper PDF, allow clean re-upload flow.
    if (selectedType === 'research_paper' && removedUrl && /\.pdf$/i.test(removedUrl)) {
      setPaperPdfUrl(null);
      setParseError('');
      setPaperMetadataLoaded(false);
    }
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

    // Build paper metadata for research_paper
    const researchAuthors = paperAuthors.map((a) => a.trim()).filter(Boolean);

    // Clear previous submit errors
    setSubmitError('');

    // Enforce organization for research papers
    if (selectedType === 'research_paper') {
      if (!values.organizationId || values.organizationId === 'personal') {
        setSubmitError('Research paper posts must belong to an organization. Please select one.');
        return;
      }
      const researchPdfCount = mediaUrls.filter((u) => /\.pdf$/i.test(u)).length;
      if (researchPdfCount !== 1) {
        setSubmitError('Research paper posts require exactly one PDF file.');
        return;
      }
      const missingFields: string[] = [];
      if (!paperResearchTitle.trim()) missingFields.push('research title');
      if (!paperDatePublished) missingFields.push('publication date');
      if (!paperJournal.trim()) missingFields.push('journal');
      if (!paperAbstract.trim()) missingFields.push('abstract');
      if (researchAuthors.length === 0) missingFields.push('at least one author');
      if (missingFields.length > 0) {
        setSubmitError(`Missing required fields: ${missingFields.join(', ')}.`);
        return;
      }
    }

    const paperMetadata: PaperMetadataInput | null =
      selectedType === 'research_paper'
        ? {
            researchTitle: paperResearchTitle.trim() || null,
            datePublished: paperDatePublished || null,
            journal: paperJournal.trim() || null,
            doi: paperDoi.trim() || null,
            isbn: paperIsbn.trim() || null,
            authors: researchAuthors,
            abstract: paperAbstract.trim() || null,
          }
        : null;

    const isOrgPost = values.organizationId && values.organizationId !== 'personal';

    await createPost.mutateAsync({
      title: values.title,
      body: bodyJson,
      bodyText,
      tags: cleanTags,
      organizationId: isOrgPost ? values.organizationId : null,
      type: values.type,
      status: isOrgPost ? 'pending' : 'published',
      mediaUrls,
      poll,
      paperMetadata,
    });

    // Keep temp PDF for published post; skip cancel cleanup for this close.
    skipTempCleanupOnCloseRef.current = true;

    // Reset form
    reset();
    editor?.commands.clearContent();
    setMediaUrls([]);
    setTags(['']);
    setPaperAuthors(['']);
    setPaperResearchTitle('');
    setPaperJournal('');
    setPaperDoi('');
    setPaperIsbn('');
    setPaperAbstract('');
    setPaperDatePublished('');
    setPaperPdfUrl(null);
    setParsingPdf(false);
    setPaperMetadataLoaded(false);
    setParseError('');
    setSubmitError('');
    setOpen(false);
    skipTempCleanupOnCloseRef.current = false;
  };

  const handleDialogOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen && !skipTempCleanupOnCloseRef.current) {
      await cleanupTempUploads();
      setMediaUrls((prev) => prev.filter((url) => !isTempUrl(url)));
      setPaperPdfUrl(null);
      setParseError('');
      setPaperMetadataLoaded(false);
    }

    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className={`max-h-[90vh] overflow-y-auto ${selectedType === 'research_paper' ? 'sm:max-w-4xl' : 'sm:max-w-3xl'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            Create Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Post type + Org selector row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] font-medium text-muted-foreground">Post Type</Label>
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
                      <SelectItem value="research_paper">Research Paper</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

          {/* Organization selector - enforce org for research papers */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-[14px] font-medium text-muted-foreground">Organization</Label>
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Personal" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedType !== 'research_paper' && (
                        <SelectItem value="personal">Personal</SelectItem>
                      )}
                      {userOrgs?.map((org) => (
                        <SelectItem key={org._id} value={org._id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {selectedType === 'research_paper' && (
                <p className="text-[12px] text-amber-600">Research papers must belong to an organization.</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title" className="text-[14px] font-medium text-muted-foreground">
              Title *
            </Label>
            <Input
              id="title"
              placeholder="Give your post a title…"
              className="text-[18px] font-medium"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-[14px] text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Rich-text body */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[14px] font-medium text-muted-foreground">Body</Label>
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

          {/* Paper Share – AI-powered metadata extraction */}
          {selectedType === 'research_paper' && !paperMetadataLoaded && !parsingPdf && (
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/20 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-[16px] font-medium text-blue-900">Upload your research paper PDF</p>
                <p className="mt-1 text-[14px] text-blue-600/70">
                  Upload your file and our AI will automatically extract the title, authors, abstract, keywords, and other details for you.
                </p>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-[16px] font-medium text-white transition-colors hover:bg-blue-700">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading…' : 'Choose PDF File'}
                </div>
              </label>
            </div>
          )}

          {/* AI parsing in progress */}
          {selectedType === 'research_paper' && parsingPdf && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/30 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Sparkles className="h-6 w-6 animate-pulse text-blue-600" />
              </div>
              <div>
                <p className="text-[16px] font-medium text-blue-900">Extracting paper details…</p>
                <p className="mt-1 text-[14px] text-blue-600/70">
                  AI is reading your PDF and extracting metadata. This may take a moment.
                </p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          )}

          {/* Parse error */}
          {selectedType === 'research_paper' && parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-[14px] text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          {/* Paper metadata fields — shown after AI parsing or manual trigger */}
          {selectedType === 'research_paper' && paperMetadataLoaded && (
            <div className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50/30 p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <Label className="font-semibold text-blue-900">Research Paper Details</Label>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[12px] font-medium text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-filled — review &amp; edit as needed
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[14px] font-medium text-muted-foreground">Research Title *</Label>
                <Input
                  placeholder="Enter the title of the research paper"
                  value={paperResearchTitle}
                  onChange={(e) => setPaperResearchTitle(e.target.value)}
                  className="text-[16px]"
                />
                <span className="text-[12px] text-muted-foreground/60">This is different from the post title shown in the feed.</span>
              </div>

              {/* ── Row 1: Abstract (full width) ── */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-[14px] font-medium text-muted-foreground">Abstract *</Label>
                <textarea
                  value={paperAbstract}
                  onChange={(e) => setPaperAbstract(e.target.value)}
                  placeholder="Paste or type the abstract of the paper…"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-[16px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* ── Row 2: Publication details (2-col grid) ── */}
              <div>
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  Publication Details
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[14px] font-medium text-muted-foreground">Journal *</Label>
                    <Input
                      placeholder="e.g. Philippine Journal of Nutrition"
                      value={paperJournal}
                      onChange={(e) => setPaperJournal(e.target.value)}
                      className="text-[16px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[14px] font-medium text-muted-foreground">Date Published *</Label>
                    <Input
                      type="date"
                      value={paperDatePublished}
                      onChange={(e) => setPaperDatePublished(e.target.value)}
                      className="text-[16px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[14px] font-medium text-muted-foreground">DOI</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. 10.1000/xyz123"
                        value={paperDoi}
                        onChange={(e) => setPaperDoi(e.target.value)}
                        className="text-[16px]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className="shrink-0 gap-1.5 text-[14px]"
                        disabled={!paperDoi.trim() || enrichDoi.isPending}
                        onClick={async () => {
                          if (!paperDoi.trim()) return;
                          try {
                            const data = await enrichDoi.mutateAsync(paperDoi.trim());
                            if (data.title) setPaperResearchTitle(data.title);
                            if (data.abstract) setPaperAbstract(data.abstract);
                            if (data.journal) setPaperJournal(data.journal);
                            if (data.year) setPaperDatePublished(`${data.year}-01-01`);
                            if (data.authors?.length) setPaperAuthors(data.authors);
                            if (data.keywords?.length) {
                              setTags((prev) => {
                                const existing = prev.filter((t) => t.trim());
                                const newKeywords = data.keywords.slice(0, 5);
                                const merged = [...existing, ...newKeywords].slice(0, 10);
                                return merged.length > 0 ? merged : [''];
                              });
                            }
                          } catch {
                            // silently fail
                          }
                        }}
                      >
                        {enrichDoi.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {enrichDoi.isPending ? 'Fetching…' : 'Fetch from DOI'}
                      </Button>
                    </div>
                    <span className="text-[12px] text-muted-foreground/60">Optional — Digital Object Identifier</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[14px] font-medium text-muted-foreground">ISBN</Label>
                    <Input
                      placeholder="e.g. 978-3-16-148410-0"
                      value={paperIsbn}
                      onChange={(e) => setPaperIsbn(e.target.value)}
                      className="text-[16px]"
                    />
                    <span className="text-[12px] text-muted-foreground/60">Optional — for book chapters or proceedings</span>
                  </div>
                </div>
              </div>

              {/* ── Row 3: Authors ── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                      Authors *
                    </p>
                    <span className="text-[12px] text-muted-foreground/60">Add each author&apos;s full name. The first entry is the primary author.</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="default"
                    className="h-8 gap-1.5 text-[14px] text-primary hover:text-primary/80"
                    onClick={() => setPaperAuthors((prev) => [...prev, ''])}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Author
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {paperAuthors.map((author, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-[12px] text-blue-600 font-medium">
                        {idx + 1}
                      </div>
                      <Input
                        value={author}
                        onChange={(e) =>
                          setPaperAuthors((prev) => prev.map((a, i) => (i === idx ? e.target.value : a)))
                        }
                        placeholder="Author full name"
                        className="flex-1 text-[16px]"
                      />
                      {paperAuthors.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => setPaperAuthors((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
                <p className="text-[14px] text-destructive">{errors.pollQuestion.message}</p>
              )}

              <div className="flex flex-col gap-2">
                {pollFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-white text-[14px] text-muted-foreground">
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
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollFields.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className="w-fit gap-2 text-[14px]"
                    onClick={() => addPollOption({ id: optionId(), text: '' })}
                  >
                    <Plus className="h-4 w-4" />
                    Add option
                  </Button>
                )}
              </div>

              <label className="flex items-center gap-2 text-[16px]">
                <input type="checkbox" {...register('pollIsMultiple')} className="rounded border-border" />
                Allow multiple choices
              </label>
            </div>
          )}

          {/* Attachments & Tags row */}
          <div className={`grid gap-4 ${selectedType === 'poll' || selectedType === 'research_paper' ? '' : 'sm:grid-cols-2'}`}>

          {/* Media uploads — hidden for research_paper when metadata not yet loaded (handled by the upload prompt above) */}
          {(selectedType !== 'research_paper' || paperMetadataLoaded) && (
          <div className="flex flex-col gap-2">
            <Label className="text-[14px] font-medium text-muted-foreground">
              {selectedType === 'research_paper' ? 'Additional Attachments (Images)' : 'Attachments'}
            </Label>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
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
                {uploading ? 'Uploading…' : 'Click to upload files (images, videos, PDFs, etc.)'}
              </div>
            </label>
            {selectedType !== 'research_paper' && (
              <p className="text-[13px] text-muted-foreground/70">
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
          )}

          {/* Tags – Individual inputs */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[14px] font-medium text-muted-foreground">
                Tags {tags.filter((t) => t.trim()).length > 0 && (
                  <span className="text-muted-foreground/60">({tags.filter((t) => t.trim()).length}/10)</span>
                )}
              </Label>
              {tags.length < 10 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  className="h-8 gap-1.5 text-[14px] text-primary hover:text-primary/80"
                  onClick={addTag}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Tag
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="relative">
                    <Hash className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                    <Input
                      value={tag}
                      onChange={(e) => updateTag(idx, e.target.value)}
                      placeholder="tag name"
                      className="h-9 w-40 pl-7 text-[14px]"
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

          </div>{/* end Attachments & Tags grid */}

          <Separator />

          {/* Inline validation error */}
          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[14px] text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Org approval notice */}
          {watch('organizationId') && watch('organizationId') !== 'personal' && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5 text-[14px] text-amber-800">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">This post will be submitted for admin review</p>
                <p className="mt-0.5 text-[13px] text-amber-600">
                  Organization posts require approval before they become visible. You will be notified once your post is accepted or rejected.
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-2">
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
              {watch('organizationId') && watch('organizationId') !== 'personal' ? 'Submit for Review' : 'Publish'}
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
