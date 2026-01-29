'use client';

import { User } from 'lucide-react';
import { useState, useEffect } from 'react';
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
}

export function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  fallback,
  fill = false,
  style,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false);
  }, [src]);

  const handleError = () => {
    setError(true);
  };
  
  // Note: Replacing next/image with a standard <img> tag for reliability in environments
  // where Next.js image optimization might face configuration or network issues.
  // This bypasses optimization but ensures images from any source are displayed consistently.

  if (!currentSrc || error) {
    return fallback || (
      <div className={cn("bg-muted flex items-center justify-center", className)} style={style}>
        <User className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  }

  // We are using a standard img tag for better reliability with external sources.
  // eslint-disable-next-line @next/next/no-img-element
  return (
     <img
        src={currentSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={cn(fill && "h-full w-full object-cover", className)}
        style={style}
        onError={handleError}
        {...props}
      />
  );
}
