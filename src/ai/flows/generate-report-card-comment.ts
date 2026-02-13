// Stub pour la génération de commentaires de bulletin avec IA
// Cette fonctionnalité sera implémentée dans une version ultérieure

export async function generateReportCardComment(params: {
    studentName: string;
    grades?: Array<{ subject: string; grade: number; maxGrade: number }>;
    attendance?: number;
    behavior?: string;
    subject?: string;
    teacherName?: string;
    average?: number;
}): Promise<string> {
    // Pour l'instant, retourner un commentaire générique
    // TODO: Implémenter avec Genkit AI dans une version future

    const effectiveAverage = params.average ?? (params.grades && params.grades.length > 0
        ? params.grades.reduce((sum, g) => sum + (g.grade / g.maxGrade) * 20, 0) / params.grades.length
        : 10);

    const subjectStr = params.subject ? ` en ${params.subject}` : '';

    if (effectiveAverage >= 16) {
        return `Excellent travail de ${params.studentName}${subjectStr}. Continue ainsi !`;
    } else if (effectiveAverage >= 14) {
        return `Très bon travail de ${params.studentName}${subjectStr}. Quelques efforts supplémentaires permettront d'atteindre l'excellence.`;
    } else if (effectiveAverage >= 12) {
        return `Bon travail de ${params.studentName}${subjectStr}. Il est encouragé à poursuivre ses efforts.`;
    } else if (effectiveAverage >= 10) {
        return `Travail satisfaisant de ${params.studentName}${subjectStr}. Des efforts supplémentaires sont nécessaires${params.subject ? '' : ' dans certaines matières'}.`;
    } else {
        return `${params.studentName} doit redoubler d'efforts${subjectStr} pour améliorer ses résultats. Un soutien personnalisé est recommandé.`;
    }
}
