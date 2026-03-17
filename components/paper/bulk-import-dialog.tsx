'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useBulkImportPapers } from '@/lib/api/papers';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
}

export function BulkImportDialog({ open, onClose, orgId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: { row: number; reason: string }[];
  } | null>(null);

  const importMutation = useBulkImportPapers();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    try {
      const data = await importMutation.mutateAsync({ file, organizationId: orgId });
      setResult(data);
    } catch {
      // error shown via mutation state
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    importMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const downloadTemplate = () => {
    const csv =
      'title,authors,abstract,keywords,doi,year,journal,isbn\n' +
      '"Nutritional Status of Children in Rural UPLB Communities","Juan Dela Cruz; Maria Santos","This study investigates the nutritional status of children aged 6–12 in selected barangays near UPLB.","nutrition; food security; children",10.1234/example,2023,"Philippine Journal of Nutrition",\n' +
      '"Impact of Urban Agriculture on Food Access in Los Baños","Ana Reyes","This paper examines how community gardens affect household food security in urban settings.","urban agriculture; food access",,2022,"SEARCA Agricultural Development Journal",';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'papers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[20px]">Bulk Import Papers from CSV</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-3 text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="text-[15px] font-medium">
                Import complete — {result.created} paper{result.created !== 1 ? 's' : ''} created
                {result.skipped > 0 && `, ${result.skipped} row${result.skipped !== 1 ? 's' : ''} skipped`}.
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] font-semibold text-destructive">Row errors:</p>
                <ul className="max-h-40 overflow-y-auto rounded-md border border-destructive/20 bg-destructive/5 p-2 text-[13px] text-destructive">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleClose} className="self-end">
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {/* Format instructions */}
            <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-[14px] text-muted-foreground">
              <p className="font-medium text-foreground">CSV Format</p>
              <p className="mt-1">
                Required column: <code className="rounded bg-muted px-1 text-[13px]">title</code>
              </p>
              <p className="mt-0.5">
                Optional:{' '}
                <code className="rounded bg-muted px-1 text-[13px]">
                  authors, abstract, keywords, doi, year, journal, isbn
                </code>
              </p>
              <p className="mt-1 text-[13px]">
                Use <strong>semicolons</strong> to separate multiple authors or keywords within a
                cell (e.g.{' '}
                <code className="rounded bg-muted px-1">Juan Dela Cruz; Maria Santos</code>).
              </p>
              <button
                onClick={downloadTemplate}
                className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                Download template CSV
              </button>
            </div>

            {/* File picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-medium text-foreground">CSV File</label>
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 px-6 py-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-7 w-7 text-muted-foreground/60" />
                {file ? (
                  <p className="text-[14px] font-medium text-foreground">{file.name}</p>
                ) : (
                  <p className="text-[14px] text-muted-foreground">
                    Click to select a <strong>.csv</strong> file
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Error banner */}
            {importMutation.isError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[14px] text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Import failed. Please check your CSV format and try again.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Import
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
