'use client';

/**
 * Contexte global d'année scolaire actuellement consultée par l'utilisateur.
 *
 * - Par défaut : `school.currentAcademicYear`
 * - L'utilisateur peut basculer sur une année archivée pour consulter
 *   les données historiques (notes, paiements, comptabilité, etc.).
 * - La sélection est persistée localement par école dans `localStorage`
 *   pour traverser les rechargements de page.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSchoolData } from '@/hooks/use-school-data';
import { usePeriodPreference, type PeriodPreferenceType } from '@/hooks/use-period-preference';
import { reportingPeriodLabel, type ReportingPeriod } from '@/lib/academic-year-utils';

interface AcademicYearContextValue {
    /** Année actuellement consultée. */
    selectedYear: string;
    /** Année courante définie au niveau de l'école. */
    currentYear: string;
    /** Liste des années connues : courante + archivées. */
    availableYears: string[];
    /** Indique si on consulte une année autre que l'année courante. */
    isViewingArchive: boolean;
    /** Bascule sur une autre année. */
    selectYear: (year: string) => void;
    /** Réinitialise sur l'année courante de l'école. */
    resetToCurrent: () => void;

    /**
     * Préférence de période pour les rapports/statistiques financiers et
     * administratifs (jamais les notes/bulletins, toujours en année scolaire).
     */
    periodType: PeriodPreferenceType;
    setPeriodType: (type: PeriodPreferenceType) => void;
    calendarYear: number;
    setCalendarYear: (year: number) => void;
    /** Quelques années civiles autour de l'actuelle, pour un sélecteur. */
    availableCalendarYears: number[];
    /** Période effective à passer à `filterByReportingPeriod`. */
    reportingPeriod: ReportingPeriod;
    /** Libellé lisible de la période effective (ex. "Année civile 2025"). */
    reportingPeriodLabel: string;
}

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

const STORAGE_PREFIX = 'gereecole.selectedYear:';

function readStored(schoolId: string | null | undefined): string | null {
    if (typeof window === 'undefined' || !schoolId) return null;
    try {
        return window.localStorage.getItem(STORAGE_PREFIX + schoolId);
    } catch {
        return null;
    }
}

function persist(schoolId: string | null | undefined, year: string): void {
    if (typeof window === 'undefined' || !schoolId) return;
    try {
        window.localStorage.setItem(STORAGE_PREFIX + schoolId, year);
    } catch {
        /* quota dépassé ou navigation privée — on ignore */
    }
}

export function AcademicYearProvider({ children }: { children: ReactNode }) {
    const { schoolId, schoolData } = useSchoolData();
    const {
        periodType,
        calendarYear,
        setPeriodType,
        setCalendarYear,
    } = usePeriodPreference();

    const currentYear = schoolData?.currentAcademicYear || defaultCurrentYear();

    const availableYears = useMemo(() => {
        const archivedYears = (schoolData?.archivedYears as string[] | undefined) ?? [];
        const set = new Set<string>([currentYear, ...archivedYears].filter(Boolean));
        return Array.from(set).sort((a, b) => b.localeCompare(a)); // plus récente d'abord
    }, [currentYear, schoolData?.archivedYears]);

    const [selectedYear, setSelectedYear] = useState<string>(currentYear);

    // Rétablir le choix mémorisé quand l'école est connue.
    useEffect(() => {
        const stored = readStored(schoolId);
        const initial = stored && availableYears.includes(stored) ? stored : currentYear;
        setSelectedYear(initial);
    }, [schoolId, currentYear, availableYears]);

    const selectYear = useCallback((year: string) => {
        setSelectedYear(year);
        persist(schoolId, year);
    }, [schoolId]);

    const resetToCurrent = useCallback(() => {
        setSelectedYear(currentYear);
        persist(schoolId, currentYear);
    }, [schoolId, currentYear]);

    const availableCalendarYears = useMemo(() => {
        const nowYear = new Date().getFullYear();
        const years = new Set<number>([calendarYear, nowYear, nowYear - 1, nowYear - 2]);
        return Array.from(years).sort((a, b) => b - a);
    }, [calendarYear]);

    const reportingPeriod: ReportingPeriod = periodType === 'calendar'
        ? { type: 'calendar', year: calendarYear }
        : { type: 'academic', selectedYear, currentYear };

    const value: AcademicYearContextValue = {
        selectedYear,
        currentYear,
        availableYears,
        isViewingArchive: selectedYear !== currentYear,
        selectYear,
        resetToCurrent,
        periodType,
        setPeriodType,
        calendarYear,
        setCalendarYear,
        availableCalendarYears,
        reportingPeriod,
        reportingPeriodLabel: reportingPeriodLabel(reportingPeriod),
    };

    return (
        <AcademicYearContext.Provider value={value}>
            {children}
        </AcademicYearContext.Provider>
    );
}

export function useAcademicYear(): AcademicYearContextValue {
    const ctx = useContext(AcademicYearContext);
    if (!ctx) {
        // Fallback sans crash : on retourne une valeur calculée hors contexte
        // pour faciliter les usages dans des composants isolés (tests, storybook).
        const fallback = defaultCurrentYear();
        return {
            selectedYear: fallback,
            currentYear: fallback,
            availableYears: [fallback],
            isViewingArchive: false,
            selectYear: () => {},
            resetToCurrent: () => {},
            periodType: 'academic',
            setPeriodType: () => {},
            calendarYear: new Date().getFullYear(),
            setCalendarYear: () => {},
            availableCalendarYears: [new Date().getFullYear()],
            reportingPeriod: { type: 'academic', selectedYear: fallback, currentYear: fallback },
            reportingPeriodLabel: `Année scolaire ${fallback}`,
        };
    }
    return ctx;
}

export function defaultCurrentYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    // Année scolaire change autour de septembre.
    if (now.getMonth() >= 8) {
        return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
}
