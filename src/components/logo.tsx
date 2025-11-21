
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
            <h1 className="text-lg font-bold font-headline leading-tight">GèreEcole</h1>
            {loading ? (
                <Skeleton className="h-3 w-24 mt-1" />
            ) : schoolName && schoolName !== 'GèreEcole' ? (
                <p className="text-xs text-muted-foreground leading-tight">{schoolName}</p>
            ) : (
                // Render a placeholder with the same height to avoid layout shift
                <div className="h-3 mt-1" /> 
            )}
        </div>
    </Link>
  );
}
