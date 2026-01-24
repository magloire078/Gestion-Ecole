'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SafeImage } from './ui/safe-image';
import placeholderImages from '@/lib/placeholder-images.json';

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  disableLink?: boolean;
}

export function Logo({ compact = false, schoolName, disableLink = false }: LogoProps) {
    const finalSchoolName = schoolName || 'GèreEcole';

    const LogoContent = () => (
      <div className={cn("flex items-center gap-3 text-foreground font-semibold", !disableLink && "group")}>
          <div className={cn("relative transition-transform", compact ? "h-14 w-14" : "h-16 w-16", !disableLink && "group-hover:scale-105")}>
            <SafeImage
              src={placeholderImages.mainAppLogo}
              alt={`${finalSchoolName} logo`}
              fill
              style={{objectFit: 'contain'}}
            />
          </div>
          {!compact && (
          <div className="flex flex-col">
              <h1 className="text-xl font-bold leading-tight">{finalSchoolName}</h1>
          </div>
          )}
      </div>
    );

    if (disableLink) {
      return <LogoContent />;
    }

    return (
        <Link href="/dashboard">
          <LogoContent />
        </Link>
    );
}
