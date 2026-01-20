
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { School } from 'lucide-react';

const DefaultLogo = ({ compact }: { compact?: boolean }) => (
    <div className={cn("flex items-center justify-center bg-primary/10 rounded-lg text-primary", compact ? "h-9 w-9" : "h-8 w-8")}>
        <School className={cn(compact ? "h-6 w-6" : "h-5 w-5")} />
    </div>
);

interface LogoProps {
  compact?: boolean;
  schoolName?: string | null;
  logoUrl?: string | null;
}

export function Logo({ compact = false, schoolName, logoUrl }: LogoProps) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-primary font-semibold">
        <Avatar className={cn("bg-transparent", compact ? "h-9 w-9" : "h-8 w-8")}>
            <AvatarImage src={logoUrl || undefined} alt={schoolName || 'Logo École'} className="object-contain" />
            <AvatarFallback className="bg-transparent">
                 <DefaultLogo compact={compact} />
            </AvatarFallback>
        </Avatar>
        {!compact && (
          <div className="flex flex-col">
            <h1 className="text-lg font-bold font-headline leading-tight">{schoolName || 'GèreEcole'}</h1>
          </div>
        )}
    </Link>
  );
}
