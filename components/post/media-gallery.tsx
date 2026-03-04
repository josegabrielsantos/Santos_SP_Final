'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play } from 'lucide-react';
import { MediaViewer } from './media-viewer';

const MAX_HEIGHT = 420; // px - maximum height for the media container

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)/i.test(url);
}

function isPdf(url: string) {
  return /\.pdf$/i.test(url);
}

/** Filters out PDFs — they're shown separately */
function getVisualMedia(urls: string[]) {
  return urls.filter((u) => !isPdf(u));
}

// ─── Smart image that determines its own aspect ratio ───────────

function SmartMedia({
  url,
  className = '',
  onClick,
  overlay,
}: {
  url: string;
  className?: string;
  onClick?: () => void;
  overlay?: React.ReactNode;
}) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      if (naturalWidth > 0) {
        setAspectRatio(naturalHeight / naturalWidth);
      }
    }
  }, []);

  const handleVideoLoad = useCallback(() => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      if (videoWidth > 0) {
        setAspectRatio(videoHeight / videoWidth);
      }
    }
  }, []);

  // Determine fit style based on aspect ratio
  // If height > 3x width, use object-cover; otherwise object-contain
  const fitClass = aspectRatio !== null && aspectRatio > 3 ? 'object-cover' : 'object-contain';

  if (isVideo(url)) {
    return (
      <div
        className={`relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 bg-black/5 ${className}`}
        style={{ maxHeight: `${MAX_HEIGHT}px` }}
        onClick={onClick}
      >
        <video
          ref={videoRef}
          src={url}
          onLoadedMetadata={handleVideoLoad}
          muted
          playsInline
          className={`h-full w-full ${fitClass}`}
        />
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30">
          <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm">
            <Play className="h-6 w-6 fill-white text-white" />
          </div>
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <div
      className={`relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 bg-muted/30 ${className}`}
      style={{ maxHeight: `${MAX_HEIGHT}px` }}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={url}
        alt=""
        onLoad={handleImageLoad}
        className={`h-full w-full ${fitClass}`}
      />
      {overlay}
    </div>
  );
}

// ─── Main MediaGallery component ────────────────────────────────

interface MediaGalleryProps {
  urls: string[];
}

export function MediaGallery({ urls }: MediaGalleryProps) {
  const mediaUrls = getVisualMedia(urls);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  if (mediaUrls.length === 0) return null;

  return (
    <>
      <div
        className="overflow-hidden rounded-lg"
        style={{ maxHeight: `${MAX_HEIGHT}px` }}
      >
        {mediaUrls.length === 1 && (
          <SingleMedia url={mediaUrls[0]} onClick={() => openViewer(0)} />
        )}

        {mediaUrls.length === 2 && (
          <TwoMedia urls={mediaUrls} onOpen={openViewer} />
        )}

        {mediaUrls.length >= 3 && (
          <MultiMedia urls={mediaUrls} onOpen={openViewer} />
        )}
      </div>

      <MediaViewer
        urls={mediaUrls}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}

// ─── Layout: Single image/video ─────────────────────────────────

function SingleMedia({ url, onClick }: { url: string; onClick: () => void }) {
  return (
    <SmartMedia
      url={url}
      className="w-full"
      onClick={onClick}
    />
  );
}

// ─── Layout: Two images/videos side by side ─────────────────────

function TwoMedia({ urls, onOpen }: { urls: string[]; onOpen: (i: number) => void }) {
  return (
    <div className="flex h-full gap-1.5" style={{ maxHeight: `${MAX_HEIGHT}px` }}>
      <SmartMedia
        url={urls[0]}
        className="w-1/2"
        onClick={() => onOpen(0)}
      />
      <SmartMedia
        url={urls[1]}
        className="w-1/2"
        onClick={() => onOpen(1)}
      />
    </div>
  );
}

// ─── Layout: 3+ images (main left, stack right) ─────────────────

function MultiMedia({ urls, onOpen }: { urls: string[]; onOpen: (i: number) => void }) {
  const remaining = urls.length - 3; // how many MORE after the 3rd

  return (
    <div className="flex h-full gap-1.5" style={{ maxHeight: `${MAX_HEIGHT}px` }}>
      {/* Main image - ~3/4 width */}
      <SmartMedia
        url={urls[0]}
        className="w-3/4"
        onClick={() => onOpen(0)}
      />

      {/* Right column - ~1/4 width, stacked */}
      <div className="flex w-1/4 flex-col gap-1.5" style={{ maxHeight: `${MAX_HEIGHT}px` }}>
        <SmartMedia
          url={urls[1]}
          className="flex-1 min-h-0"
          onClick={() => onOpen(1)}
        />
        <SmartMedia
          url={urls[2]}
          className="flex-1 min-h-0"
          onClick={() => onOpen(2)}
          overlay={
            remaining > 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-colors hover:bg-black/40">
                <span className="text-2xl font-bold text-white">+{remaining}</span>
              </div>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
