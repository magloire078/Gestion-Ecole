
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  logoUrl?: string | null; // Prop is kept for compatibility but not used
}

export function Logo({ compact = false, schoolName }: LogoProps) {
    const finalSchoolName = schoolName || 'GèreEcole';

    return (
        <Link href="/dashboard" className="flex items-center gap-3 text-foreground font-semibold group">
            <div className={cn("p-2 bg-primary rounded-lg group-hover:scale-105 transition-transform")}>
                <ShieldCheck className={cn("text-primary-foreground", compact ? "h-6 w-6" : "h-7 w-7")} />
            </div>
            {!compact && (
            <div className="flex flex-col">
                <h1 className="text-xl font-bold leading-tight">{finalSchoolName}</h1>
            </div>
            )}
        </Link>
    );
}
