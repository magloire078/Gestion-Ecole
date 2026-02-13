'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SafeImage } from './ui/safe-image';

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  logoUrl?: string | null;
  disableLink?: boolean;
  className?: string;
}

export function Logo({ compact = false, schoolName, logoUrl, disableLink = false, className }: LogoProps) {
  const isDefaultLogo = !logoUrl;
  const finalSchoolName = schoolName || 'GèreEcole';

  const LogoContent = () => (
    <div className={cn(
      "flex text-foreground",
      compact ? "flex-row items-center gap-3" : "flex-col items-center gap-2",
      !disableLink && "group",
      className
    )}>
      <div className={cn(
        "relative flex items-center justify-center transition-transform duration-300",
        !disableLink && "group-hover:scale-105"
      )}>
        {logoUrl ? (
          <div className={cn(
            "relative bg-white rounded-full shadow-md border border-border/10 overflow-hidden",
            compact ? "h-10 w-10" : "h-16 w-16"
          )}>
            <SafeImage src={logoUrl} alt={`${finalSchoolName} Logo`} fill className="object-contain" />
          </div>
        ) : (
          <div className="relative" style={{ width: compact ? 50 : 100, height: compact ? 50 : 100 }}>
            <SafeImage
              src="/custom-assets/logo.png?v=2"
              alt="GéreEcole Logo"
              fill
              className="object-contain"
            />
          </div>
        )}
      </div>

      {!compact && !isDefaultLogo && (
        <div className="mt-[-5px] flex flex-col select-none items-center text-center">
          <span className="text-3xl font-black tracking-tighter leading-none dark:text-white text-[#0C365A]">
            GÉRECOLE
          </span>
          <span className="text-[0.7rem] font-bold tracking-[0.3em] mt-1 leading-none uppercase dark:text-primary/80 text-[#2D9CDB]">
            Gestion d'école
          </span>
        </div>
      )}
    </div>
  );

  if (disableLink) {
    return <LogoContent />;
  }

  return (
    <Link href="/dashboard" className="no-underline">
      <LogoContent />
    </Link>
  );
}
