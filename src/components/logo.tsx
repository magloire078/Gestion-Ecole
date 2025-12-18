
'use client';

import Link from 'next/link';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from './ui/skeleton';
import { SafeImage } from './ui/safe-image';
import { cn } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

const DefaultLogo = ({ compact }: { compact?: boolean }) => (
    <div className={cn("flex items-center justify-center bg-primary/10 rounded-lg text-primary", compact ? "h-9 w-9" : "h-8 w-8")}>
        <BookOpen className={cn(compact ? "h-6 w-6" : "h-5 w-5")} />
    </div>
);


export function Logo({ compact = false }: { compact?: boolean }) {
  const { schoolData, loading } = useSchoolData();

  if (loading) {
    return (
       <div className="flex items-center gap-2 text-primary font-semibold">
          <Skeleton className={cn("rounded-lg", compact ? "h-9 w-9" : "h-8 w-8")} />
          {!compact && (
            <div className="flex flex-col">
              <Skeleton className="h-5 w-32" />
            </div>
          )}
      </div>
    )
  }

  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-primary font-semibold">
        <SafeImage 
            src={schoolData?.mainLogoUrl} 
            alt={schoolData?.name || 'Logo École'} 
            width={32} 
            height={32} 
            className={cn("object-contain transition-all duration-300", compact ? "h-9 w-9" : "h-8 w-8")}
            fallback={<DefaultLogo compact={compact} />}
        />
        {!compact && (
          <div className="flex flex-col">
            <h1 className="text-lg font-bold font-headline leading-tight">{schoolData?.name || 'Mon École'}</h1>
          </div>
        )}
    </Link>
  );
}
