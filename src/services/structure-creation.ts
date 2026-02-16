
import type { Firestore } from 'firebase/firestore';
import { collection, writeBatch, doc } from 'firebase/firestore';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';

interface SchoolTemplate {
    cycles: Omit<Cycle, 'schoolId'>[];
    niveaux: Record<string, string[]>;
}

export async function applySchoolTemplate(firestore: Firestore, schoolId: string, template: SchoolTemplate): Promise<void> {
    const batch = writeBatch(firestore);

    for (const cycle of template.cycles) {
        // Crée un nouveau document pour le cycle et récupère sa référence
        const cycleRef = doc(collection(firestore, `ecoles/${schoolId}/cycles`));
        const cycleData = { ...cycle, schoolId };
        batch.set(cycleRef, cycleData);

        // Récupère la liste des niveaux pour ce nom de cycle
        const niveauxForCycle = template.niveaux[cycle.name];
        if (niveauxForCycle) {
            niveauxForCycle.forEach((niveauName, index) => {
                const niveauRef = doc(collection(firestore, `ecoles/${schoolId}/niveaux`));
                const niveauData: Omit<Niveau, 'id'> = {
                    schoolId,
                    cycleId: cycleRef.id,
                    name: niveauName,
                    code: niveauName.replace(/\s+/g, '').toUpperCase(),
                    order: index + 1,
                    capacity: 30, // Default capacity
                    ageMin: 0, // Default value
                    ageMax: 0, // Default value
                };
                batch.set(niveauRef, niveauData);
            });
        }
    }

    await batch.commit();
}

