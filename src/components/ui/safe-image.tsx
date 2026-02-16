'use client';

import Image from 'next/image';
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
  const [error, setError] = useState(false);

  useEffect(() => {
    if (src) {
      setError(false);
    }
  }, [src]);

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
