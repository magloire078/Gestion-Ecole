'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  disableLink?: boolean;
}

const SvgLogo = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
        </defs>
        <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 14.1209 3.66933 16.0826 4.80208 17.65" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 12H12.5C11.6716 12 11 12.6716 11 13.5V14.5" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

export function Logo({ compact = false, schoolName, disableLink = false }: LogoProps) {
    const finalSchoolName = schoolName || 'GèreEcole';

    const LogoContent = () => (
      <div className={cn("flex items-center gap-3 text-foreground font-semibold", !disableLink && "group")}>
          <div className={cn("relative transition-transform", compact ? "h-12 w-12" : "h-10 w-10", !disableLink && "group-hover:scale-105")}>
             <SvgLogo />
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
