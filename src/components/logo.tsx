
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const SCHOOL_NAME_KEY = 'schoolName';

export function Logo() {
  const [schoolName, setSchoolName] = useState("GèreEcole");

  const updateSchoolName = () => {
    const savedName = localStorage.getItem(SCHOOL_NAME_KEY);
    setSchoolName(savedName || "GèreEcole");
  };

  useEffect(() => {
    updateSchoolName();
    window.addEventListener('settings-updated', updateSchoolName);
    return () => {
      window.removeEventListener('settings-updated', updateSchoolName);
    };
  }, []);

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
      <h1 className="text-lg font-bold font-headline">{schoolName}</h1>
    </Link>
  );
}
