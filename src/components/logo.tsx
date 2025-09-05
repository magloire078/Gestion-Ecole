import { School } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 text-primary font-semibold">
      <School className="h-6 w-6" />
      <h1 className="text-lg font-bold font-headline">GèreEcole</h1>
    </Link>
  );
}
