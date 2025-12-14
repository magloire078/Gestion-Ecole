
'use client';

import Image from 'next/image';
import { User } from 'lucide-react';
import { useState } from 'react';

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
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return fallback || (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <User className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  }
  
  if (fill) {
      return (
         <Image
            src={src}
            alt={alt}
            fill
            className={className}
            onError={() => setError(true)}
            {...props}
        />
      )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 100}
      height={height || 100}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}
