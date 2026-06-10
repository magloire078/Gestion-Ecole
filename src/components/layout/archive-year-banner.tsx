'use client';

import Link from 'next/link';
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAcademicYear } from '@/providers/academic-year-provider';

/**
 * Bandeau affiché en haut des pages quand l'utilisateur consulte une
 * année scolaire archivée — pour qu'il sache que les chiffres ne
 * correspondent pas à l'année courante.
 */
export function ArchiveYearBanner() {
    const { isViewingArchive, selectedYear, currentYear, resetToCurrent } = useAcademicYear();

    if (!isViewingArchive) return null;

    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/80 px-4 py-2 text-amber-900 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm">
                <Archive className="h-4 w-4" />
                <span>
                    Vous consultez l&apos;année <strong>{selectedYear}</strong> (archive).
                    Les modifications restent désactivées dans cette vue.
                </span>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="h-7 text-amber-900 hover:bg-amber-100"
                onClick={resetToCurrent}
            >
                Revenir à {currentYear}
            </Button>
        </div>
    );
}
