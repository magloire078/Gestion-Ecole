'use client';

import { Calendar, History, GraduationCap, CalendarDays } from 'lucide-react';
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
    const {
        selectedYear, currentYear, availableYears, isViewingArchive, selectYear, resetToCurrent,
        periodType, setPeriodType, calendarYear, setCalendarYear, availableCalendarYears,
    } = useAcademicYear();

    const isCalendarMode = periodType === 'calendar';
    const triggerLabel = isCalendarMode ? String(calendarYear) : selectedYear;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        'h-9 gap-2 rounded-xl border-slate-200 bg-white/60 backdrop-blur transition-all',
                        isViewingArchive && !isCalendarMode && 'border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100',
                        className,
                    )}
                    title="Période affichée pour les rapports et statistiques financiers/administratifs. Les notes et bulletins restent toujours en année scolaire."
                >
                    {isViewingArchive && !isCalendarMode ? (
                        <History className="h-4 w-4 text-amber-600" />
                    ) : (
                        <Calendar className="h-4 w-4 text-slate-500" />
                    )}
                    {!compact && (
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            {isCalendarMode ? 'Année civile' : 'Année'}
                        </span>
                    )}
                    <span className="font-bold tabular-nums">{triggerLabel}</span>
                    {isViewingArchive && !isCalendarMode && (
                        <Badge
                            variant="outline"
                            className="hidden sm:inline-flex border-amber-300/70 bg-amber-100 text-amber-900 text-[10px]"
                        >
                            Archive
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                    Période des rapports financiers
                </DropdownMenuLabel>
                <div className="flex gap-1 px-2 pb-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={!isCalendarMode ? 'secondary' : 'ghost'}
                        className="h-8 flex-1 gap-1.5 text-xs font-semibold"
                        onClick={() => setPeriodType('academic')}
                    >
                        <GraduationCap className="h-3.5 w-3.5" />
                        Scolaire
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={isCalendarMode ? 'secondary' : 'ghost'}
                        className="h-8 flex-1 gap-1.5 text-xs font-semibold"
                        onClick={() => setPeriodType('calendar')}
                    >
                        <CalendarDays className="h-3.5 w-3.5" />
                        Civile
                    </Button>
                </div>
                <DropdownMenuSeparator />
                {isCalendarMode ? (
                    availableCalendarYears.map(year => (
                        <DropdownMenuItem
                            key={year}
                            onClick={() => setCalendarYear(year)}
                            className={cn(
                                'cursor-pointer justify-between',
                                year === calendarYear && 'bg-primary/10 font-semibold',
                            )}
                        >
                            <span className="tabular-nums">1 janv. – 31 déc. {year}</span>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <>
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
                    </>
                )}
                <DropdownMenuSeparator />
                <p className="px-2 pb-1.5 text-[10px] text-muted-foreground leading-snug">
                    Les notes et bulletins restent toujours affichés par année scolaire.
                </p>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
