'use client';

import { useState as useReactState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface CommentEditorProps {
  placeholder?: string;
  onSubmit: (html: string) => void;
  isPending?: boolean;
  submitLabel?: string;
  minHeight?: string;
  initialContent?: string;
  onCancel?: () => void;
}

export function CommentEditor({
  placeholder = 'Write a comment…',
  onSubmit,
  isPending = false,
  submitLabel = 'Post',
  minHeight = '72px',
  initialContent,
  onCancel,
}: CommentEditorProps) {
  const [isEmpty, setIsEmpty] = useReactState(!initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
      }),
    ],
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[${minHeight}] px-3 py-2 text-[15px]`,
        'data-placeholder': placeholder,
      },
    },
    content: initialContent || '',
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      setIsEmpty(!e.getText().trim());
    },
  });

  const handleSubmit = () => {
    if (!editor) return;
    const html = editor.getHTML();
    // Check if editor is empty (only contains empty paragraph)
    const text = editor.getText().trim();
    if (!text) return;
    onSubmit(html);
    editor.commands.clearContent();
    setIsEmpty(true);
  };

  if (!editor) return null;

  return (
    <div className="flex-1 rounded-md border border-input bg-background ring-offset-background focus-within:ring-1 focus-within:ring-ring">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border/40 px-2 py-1">
        <ToolbarBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <div className="mx-1 h-4 w-px bg-border/60" />
        <ToolbarBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} className="comment-editor max-h-[200px] overflow-y-auto" />

      {/* Submit */}
      <div className="flex justify-end gap-2 border-t border-border/40 px-2 py-1.5">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md px-3 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isPending || isEmpty}
          className="rounded-md bg-primary px-3 py-1 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Posting…' : submitLabel}
        </button>
      </div>
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
