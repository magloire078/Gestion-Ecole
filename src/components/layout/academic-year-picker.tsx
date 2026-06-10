'use client';

import { Calendar, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAcademicYear } from '@/providers/academic-year-provider';

interface Props {
    className?: string;
    /** Mode compact : pas de label, juste l'année. */
    compact?: boolean;
}

export function AcademicYearPicker({ className, compact = false }: Props) {
    const { selectedYear, currentYear, availableYears, isViewingArchive, selectYear, resetToCurrent } =
        useAcademicYear();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        'h-9 gap-2 rounded-xl border-slate-200 bg-white/60 backdrop-blur transition-all',
                        isViewingArchive && 'border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100',
                        className,
                    )}
                >
                    {isViewingArchive ? (
                        <History className="h-4 w-4 text-amber-600" />
                    ) : (
                        <Calendar className="h-4 w-4 text-slate-500" />
                    )}
                    {!compact && (
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            Année
                        </span>
                    )}
                    <span className="font-bold tabular-nums">{selectedYear}</span>
                    {isViewingArchive && (
                        <Badge
                            variant="outline"
                            className="hidden sm:inline-flex border-amber-300/70 bg-amber-100 text-amber-900 text-[10px]"
                        >
                            Archive
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    Sélectionner une année
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableYears.map(year => (
                    <DropdownMenuItem
                        key={year}
                        onClick={() => selectYear(year)}
                        className={cn(
                            'cursor-pointer justify-between',
                            year === selectedYear && 'bg-primary/10 font-semibold',
                        )}
                    >
                        <span className="tabular-nums">{year}</span>
                        {year === currentYear && (
                            <Badge variant="secondary" className="text-[10px]">Courante</Badge>
                        )}
                    </DropdownMenuItem>
                ))}
                {isViewingArchive && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={resetToCurrent} className="cursor-pointer">
                            <Calendar className="h-3.5 w-3.5 mr-2" />
                            Revenir à l&apos;année courante
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
