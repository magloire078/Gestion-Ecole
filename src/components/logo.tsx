
'use client';

import Link from 'next/link';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from './ui/skeleton';
import { useHydrationFix } from '@/hooks/use-hydration-fix';
import Image from 'next/image';

const DefaultLogo = () => (
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
);


export function Logo() {
  const isMounted = useHydrationFix();
  const { schoolData, loading } = useSchoolData();

  if (!isMounted || loading) {
    return (
       <div className="flex items-center gap-2 text-primary font-semibold">
          <DefaultLogo />
          <div className="flex flex-col">
            <Skeleton className="h-5 w-32" />
          </div>
      </div>
    )
  }

  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-primary font-semibold">
        {schoolData?.mainLogoUrl ? (
            <Image src={schoolData.mainLogoUrl} alt={schoolData.name || 'Logo École'} width={32} height={32} className="h-8 w-8 object-contain" />
        ) : (
            <DefaultLogo />
        )}
        <div className="flex flex-col">
          <h1 className="text-lg font-bold font-headline leading-tight">{schoolData?.name || 'Mon École'}</h1>
        </div>
    </Link>
  );
}

    