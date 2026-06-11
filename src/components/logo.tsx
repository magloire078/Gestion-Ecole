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

const sizes = {
  sm: { icon: 'w-10 h-10', text: 'text-sm' },
  md: { icon: 'w-[70px] h-[70px]', text: 'text-base' },
  lg: { icon: 'w-[120px] h-[120px]', text: 'text-lg' },
};

interface LogoContentProps {
  size: NonNullable<LogoProps['size']>;
  schoolName: string;
  rawSchoolName?: string | null;
  logoUrl?: string | null;
  disableLink: boolean;
  className?: string;
  compact: boolean;
}

function LogoContent({ size, schoolName, rawSchoolName, logoUrl, disableLink, className, compact }: LogoContentProps) {
  const currentSize = sizes[size];
  return (
    <div className={cn('flex items-center gap-4 text-foreground', !disableLink && 'group', className)}>
      <div className={cn('relative flex items-center justify-center transition-transform duration-300', !disableLink && 'group-hover:scale-105')}>
        {logoUrl ? (
          <div className={cn(
            'relative bg-white rounded-full shadow-md border border-border/10 overflow-hidden',
            size === 'sm' ? 'h-10 w-10' : size === 'md' ? 'h-16 w-16' : 'h-24 w-24',
          )}>
            <SafeImage src={logoUrl} alt={`${schoolName} Logo`} fill className="object-contain" priority />
          </div>
        ) : (
          <div className={cn('relative', currentSize.icon)}>
            <SafeImage src="/custom-assets/logo.png?v=2" alt="GèreEcole Logo" fill className="object-contain" priority />
          </div>
        )}
      </div>

      {!compact && rawSchoolName && (
        <div className="flex flex-col select-none items-start text-left min-w-0">
          <span className={cn('font-black tracking-tighter leading-tight dark:text-white text-[#0C365A] truncate w-full', currentSize.text)}>
            {rawSchoolName.toUpperCase()}
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
}

export function Logo({ size = 'md', schoolName, logoUrl, disableLink = false, className, compact = false }: LogoProps) {
  const finalSchoolName = (schoolName || 'GèreEcole').trim();
  const content = (
    <LogoContent
      size={size}
      schoolName={finalSchoolName}
      rawSchoolName={schoolName}
      logoUrl={logoUrl}
      disableLink={disableLink}
      className={className}
      compact={compact}
    />
  );

  if (disableLink) return content;

  return (
    <Link href="/dashboard" className="no-underline">
      {content}
    </Link>
  );
}
