'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SafeImage } from './ui/safe-image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  schoolName?: string | null;
  logoUrl?: string | null;
  disableLink?: boolean;
  className?: string;
  compact?: boolean;
}

export function Logo({ size = 'md', schoolName, logoUrl, disableLink = false, className, compact = false }: LogoProps) {
  const isDefaultLogo = !logoUrl;
  const finalSchoolName = (schoolName || 'Gérecole').trim();

  const sizes = {
    sm: { icon: 40, text: 'text-sm' },
    md: { icon: 70, text: 'text-base' },
    lg: { icon: 120, text: 'text-lg' }
  };

  const currentSize = sizes[size];

  const LogoContent = () => (
    <div className={cn(
      "flex items-center gap-4 text-foreground",
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
            size === 'sm' ? "h-10 w-10" : size === 'md' ? "h-16 w-16" : "h-24 w-24"
          )}>
            <SafeImage src={logoUrl} alt={`${finalSchoolName} Logo`} fill className="object-contain" />
          </div>
        ) : (
          <div className="relative" style={{ width: currentSize.icon, height: currentSize.icon }}>
            <SafeImage
              src="/custom-assets/logo.png?v=2"
              alt="GéreEcole Logo"
              fill
              className="object-contain"
            />
          </div>
        )}
      </div>

      {!compact && schoolName && (
        <div className="flex flex-col select-none items-start text-left min-w-0">
          <span className={cn(
            "font-black tracking-tighter leading-tight dark:text-white text-[#0C365A] truncate w-full",
            currentSize.text
          )}>
            {schoolName.toUpperCase()}
          </span>
          {size !== 'sm' && (
            <span className="text-[0.6rem] font-bold tracking-tight mt-0.5 leading-none text-slate-400 truncate w-full">
              Établissement Scolaire
            </span>
          )}
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
