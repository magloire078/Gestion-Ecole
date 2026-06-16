'use client';

import Image from 'next/image';
import { User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: React.ReactNode;
  fill?: boolean;
  style?: React.CSSProperties;
  "data-ai-hint"?: string;
  priority?: boolean;
}

export function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  fallback,
  fill = false,
  priority = false,
  style,
  ...props
}: SafeImageProps) {
  // "Adjusting state on prop change" pattern : on suit `src` pour
  // remettre `error` à false dès qu'il change, sans effet.
  const [prevSrc, setPrevSrc] = useState(src);
  const [error, setError] = useState(false);
  if (prevSrc !== src) {
    setPrevSrc(src);
    if (src) setError(false);
  }

  const handleError = () => {
    setError(true);
  };

  if (error || !src) {
    return fallback || (
      <div
        className={cn("bg-muted flex items-center justify-center overflow-hidden", className)}
        style={style}
      >
        <User className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      className={className}
      style={style}
      onError={handleError}
      priority={priority}
      unoptimized={typeof src === 'string' && src.startsWith('data:')}
      {...props}
    />
  );
}
