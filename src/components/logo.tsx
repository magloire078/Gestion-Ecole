'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SafeImage } from './ui/safe-image';
import placeholderImages from '@/lib/placeholder-images.json';

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  logoUrl?: string | null;
}

export function Logo({ compact = false, schoolName, logoUrl }: LogoProps) {
    const finalLogoUrl = logoUrl || placeholderImages.mainAppLogo;
    const finalSchoolName = schoolName || 'GèreEcole';

    return (
        <Link href="/dashboard" className="flex items-center gap-2 text-primary font-semibold">
            <div className={cn("relative h-24 w-24")}>
                <SafeImage 
                    src={finalLogoUrl} 
                    alt={`${finalSchoolName} Logo`}
                    fill
                    className="object-contain"
                    data-ai-hint="app logo"
                />
            </div>
            {!compact && (
            <div className="flex flex-col">
                <h1 className="text-lg font-bold font-headline leading-tight">{finalSchoolName}</h1>
            </div>
            )}
        </Link>
    );
}
