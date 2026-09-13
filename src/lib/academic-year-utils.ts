/**
 * Détermine l'année scolaire à partir d'une date.
 *
 * Hypothèse : l'année commence en septembre (mois index 8). Une date entre
 * septembre et décembre appartient à `YYYY-(YYYY+1)`, entre janvier et août
 * à `(YYYY-1)-YYYY`.
 */
export function computeAcademicYearFromDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    if (date.getMonth() >= 8) {
        return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
}

/**
 * Renvoie l'année à utiliser pour stamper un nouveau document.
 *
 * Priorité : année courante de l'école (source de vérité) → calcul à
 * partir de la date du document (fallback) → calcul à partir d'aujourd'hui.
 */
export function resolveAcademicYearForWrite(opts: {
    schoolCurrentYear?: string | null;
    docDate?: string | null;
}): string {
    if (opts.schoolCurrentYear) return opts.schoolCurrentYear;
    if (opts.docDate) {
        const d = new Date(opts.docDate);
        if (!Number.isNaN(d.getTime())) return computeAcademicYearFromDate(d);
    }
    return computeAcademicYearFromDate();
}

/**
 * Filtre une liste de documents par année scolaire.
 *
 * - Si on consulte l'année courante : on inclut les docs sans tag (legacy).
 * - Si on consulte une archive : on n'affiche que les docs explicitement
 *   tagués de cette année.
 */
export function filterByAcademicYear<T extends { academicYear?: string }>(
    items: T[],
    selectedYear: string,
    currentYear: string,
): T[] {
    const isViewingArchive = selectedYear !== currentYear;
    if (!isViewingArchive) {
        return items.filter(item => !item.academicYear || item.academicYear === selectedYear);
    }
    return items.filter(item => item.academicYear === selectedYear);
}

/**
 * Filtre une liste de documents par année civile (1er janvier - 31 décembre),
 * à partir de leur champ `date` (format ISO `YYYY-MM-DD` ou horodatage
 * complet). Les documents sans date exploitable sont exclus : contrairement
 * à l'année scolaire, il n'y a pas de "legacy" à deviner ici.
 */
export function filterByCalendarYear<T extends { date?: string | null }>(
    items: T[],
    year: number,
): T[] {
    return items.filter(item => {
        if (!item.date) return false;
        const parsed = new Date(item.date);
        if (Number.isNaN(parsed.getTime())) return false;
        return parsed.getFullYear() === year;
    });
}

/**
 * Préférence d'affichage des rapports/statistiques financiers et
 * administratifs : par année scolaire (rentrée → grandes vacances) ou par
 * année civile (1er janvier → 31 décembre). Ne concerne jamais les notes ni
 * les bulletins, qui n'ont de sens qu'en année scolaire (trimestres, classes).
 */
export type ReportingPeriod =
    | { type: 'academic'; selectedYear: string; currentYear: string }
    | { type: 'calendar'; year: number };

export function reportingPeriodLabel(period: ReportingPeriod): string {
    return period.type === 'academic'
        ? `Année scolaire ${period.selectedYear}`
        : `Année civile ${period.year}`;
}

/**
 * Filtre une liste de documents selon la période de reporting effective de
 * l'utilisateur (voir `usePeriodPreference`). Dispatche vers
 * `filterByAcademicYear` ou `filterByCalendarYear` selon le type de période.
 */
export function filterByReportingPeriod<T extends { academicYear?: string; date?: string | null }>(
    items: T[],
    period: ReportingPeriod,
): T[] {
    return period.type === 'academic'
        ? filterByAcademicYear(items, period.selectedYear, period.currentYear)
        : filterByCalendarYear(items, period.year);
}
