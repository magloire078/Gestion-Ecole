'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SafeImage } from './ui/safe-image';

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  logoUrl?: string | null;
  disableLink?: boolean;
}

export function Logo({ compact = false, schoolName, logoUrl, disableLink = false }: LogoProps) {
    const finalSchoolName = schoolName || 'GèreEcole';

    const LogoContent = () => (
      <div className={cn("flex items-center gap-3 text-foreground font-semibold", !disableLink && "group")}>
          <div className={cn("relative transition-transform flex items-center justify-center bg-card p-1 rounded-lg", compact ? "h-12 w-12" : "h-10 w-10", !disableLink && "group-hover:scale-105")}>
             {logoUrl ? (
                <SafeImage src={logoUrl} alt={`${finalSchoolName} Logo`} fill className="object-contain" />
             ) : (
                <svg
                    role="img"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-full w-full object-contain"
                >
                    <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                    </defs>
                    <path
                    d="M12 2L2 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-10-3z"
                    fill="url(#logoGradient)"
                    />
                    <text
                    x="50%"
                    y="55%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    >
                    G
                    </text>
                </svg>
             )}
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
