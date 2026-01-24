'use client';

import Link from 'next/link';
import Image from 'next/image';
import placeholderImages from '@/lib/placeholder-images.json';
import { cn } from '@/lib/utils';

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  disableLink?: boolean;
}

export function Logo({ compact = false, schoolName, disableLink = false }: LogoProps) {
    const finalSchoolName = schoolName || 'GèreEcole';

    const LogoContent = () => (
      <div className={cn("flex items-center gap-3 text-foreground font-semibold", !disableLink && "group")}>
          <div className={cn("relative transition-transform", compact ? "h-12 w-12" : "h-10 w-10", !disableLink && "group-hover:scale-105")}>
             <Image
                src={placeholderImages.mainAppLogo}
                alt="GèreEcole Logo"
                fill
                className="object-contain"
                data-ai-hint="app logo"
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
