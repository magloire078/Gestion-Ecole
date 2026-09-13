'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, GraduationCap } from 'lucide-react';
import { useAcademicYear } from '@/providers/academic-year-provider';

/**
 * Préférence personnelle : par quelle période afficher les rapports et
 * statistiques financiers/administratifs (comptabilité, paiements,
 * abonnements cantine/transport/internat...). Les notes et bulletins ne sont
 * jamais concernés : ils restent toujours affichés par année scolaire.
 */
export function PeriodPreferenceCard() {
    const {
        periodType, setPeriodType, calendarYear, setCalendarYear, availableCalendarYears,
    } = useAcademicYear();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Période des rapports financiers</CardTitle>
                <CardDescription>
                    Choisissez comment sont regroupées les données financières et administratives
                    (comptabilité, paiements, abonnements...) dans les rapports et statistiques.
                    Les notes et bulletins restent toujours par année scolaire.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <RadioGroup
                    value={periodType}
                    onValueChange={(value) => setPeriodType(value as 'academic' | 'calendar')}
                    className="grid gap-3 sm:grid-cols-2"
                >
                    <Label
                        htmlFor="period-academic"
                        className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                        <RadioGroupItem value="academic" id="period-academic" className="mt-1" />
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 font-semibold">
                                <GraduationCap className="h-4 w-4" />
                                Année scolaire
                            </div>
                            <p className="text-xs text-muted-foreground">
                                De la rentrée aux grandes vacances (ex. 2025-2026).
                            </p>
                        </div>
                    </Label>
                    <Label
                        htmlFor="period-calendar"
                        className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                        <RadioGroupItem value="calendar" id="period-calendar" className="mt-1" />
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 font-semibold">
                                <CalendarDays className="h-4 w-4" />
                                Année civile
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Du 1er janvier au 31 décembre.
                            </p>
                        </div>
                    </Label>
                </RadioGroup>

                {periodType === 'calendar' && (
                    <div className="max-w-[200px] space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Année civile affichée
                        </Label>
                        <Select value={String(calendarYear)} onValueChange={(v) => setCalendarYear(Number(v))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCalendarYears.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
