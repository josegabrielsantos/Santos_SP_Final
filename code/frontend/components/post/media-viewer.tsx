'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MediaViewerProps {
  urls: string[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)/i.test(url);
}

export function MediaViewer({ urls, initialIndex, open, onOpenChange }: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  }, [urls.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  }, [urls.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, goNext, goPrev, onOpenChange]);

  if (!urls.length) return null;
  const currentUrl = urls[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[100] bg-black/80"
        className="z-[100] flex max-h-[95vh] max-w-[95vw] items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-[95vw]"
      >
        {/* Close */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Navigation arrows */}
        {urls.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Media */}
        <div className="flex h-[90vh] w-full items-center justify-center">
          {isVideo(currentUrl) ? (
            <video
              key={currentUrl}
              src={currentUrl}
              controls
              autoPlay
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {/* Dots */}
        {urls.length > 1 && (
          <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-1.5">
            {urls.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 w-2 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'scale-125 bg-white'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
