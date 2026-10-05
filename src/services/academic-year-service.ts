'use client';

import {
    promoteStudentsToClasses,
    type PromotionRule,
    type PromoteStudentsResult,
} from './class-assignment-service';

export type { PromotionRule, PromoteStudentsResult };

/**
 * @deprecated Conservé pour compatibilité d'import — délègue entièrement à
 * `promoteStudentsToClasses` (logique partagée avec l'attribution en lot,
 * source de vérité unique `inscriptions_classe` + `eleve.classId`, et
 * journal d'audit réversible).
 */
export async function promoteStudents(
    schoolId: string,
    rules: PromotionRule[],
    toYear: string,
    userId: string,
    userName?: string,
): Promise<PromoteStudentsResult> {
    return promoteStudentsToClasses(schoolId, rules, toYear, userId, userName);
}

// Le clonage/archivage des classes et la finalisation de la bascule d'année
// (anciennement cloneClassesForNewYear / finalizeAcademicYear ici) tournent
// désormais côté serveur : voir src/lib/admin-academic-year.ts, appelée par
// POST /api/admin/academic-year/start-new-year (NewYearWizard). Le flux
// client, en deux appels séquentiels sans verrou, ne protégeait ni contre un
// double-clic ni contre deux administrateurs agissant en même temps — la
// bascule d'année étant l'action la plus destructrice de l'app (archive
// toutes les classes, vide les périodes), elle mérite une vraie transaction
// serveur plutôt qu'une confirmation textuelle côté UI.

export const AcademicYearService = {
    promoteStudents,
};
