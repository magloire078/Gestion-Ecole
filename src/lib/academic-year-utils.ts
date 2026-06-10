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
