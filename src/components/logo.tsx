
'use client';

import Link from 'next/link';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from './ui/skeleton';

export function Logo() {
  const { schoolName, loading } = useSchoolData();

  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-primary font-semibold">
        <svg
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            >
            <path d="M2 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6z" />
            <path d="M12 6s1.5-2 5-2 5 2 5 2v14s-1.5-1-5-1-5 1-5 1V6z" />
            <path d="M8 12h8" />
            <path d="M8 16h8" />
            <path d="M12 2v2" />
        </svg>
        <div className="flex flex-col">
            {loading ? (
                 <Skeleton className="h-5 w-32" />
            ) : (
                <h1 className="text-lg font-bold font-headline leading-tight">{schoolName || 'Mon École'}</h1>
            )}
            <p className="text-xs text-muted-foreground leading-tight">par GèreEcole</p>
        </div>
    </Link>
  );
}
