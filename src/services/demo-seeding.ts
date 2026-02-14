
'use server';

import type { Firestore } from 'firebase/firestore';
import { collection, writeBatch, doc, serverTimestamp, increment } from 'firebase/firestore';
import type { staff as Staff, student as Student, cycle as Cycle, niveau as Niveau, class_type as ClassType, subject as Subject } from '@/lib/data-types';

// --- DATA DEFINITIONS ---

const DEMO_CYCLES_DATA = [
    { name: "Maternelle", code: "MAT", order: 1, isActive: true, color: "#3B82F6" },
    { name: "Primaire", code: "PRI", order: 2, isActive: true, color: "#10B981" },
    { name: "Collège", code: "COL", order: 3, isActive: true, color: "#F59E0B" },
];

const DEMO_NIVEAUX_DATA = [
    { cycleName: "Maternelle", name: "Grande Section", code: "GS", order: 1, capacity: 25 },
    { cycleName: "Primaire", name: "CP1", code: "CP1", order: 2, capacity: 30 },
    { cycleName: "Primaire", name: "CE2", code: "CE2", order: 3, capacity: 30 },
    { cycleName: "Primaire", name: "CM2", code: "CM2", order: 4, capacity: 30 },
    { cycleName: "Collège", name: "6ème", code: "6EME", order: 5, capacity: 35 },
    { cycleName: "Collège", name: "3ème", code: "3EME", order: 6, capacity: 35 },
];

const DEMO_STAFF_BASE: Omit<Staff, 'schoolId' | 'uid' | 'hireDate' | 'baseSalary' | 'email' | 'displayName' | 'photoURL'>[] = [
    { firstName: "Nina", lastName: "Gbodjo", role: "enseignant", subject: "Français" },
    { firstName: "Ali", lastName: "Soro", role: "enseignant", subject: "Mathématiques" },
    { firstName: "Amenan", lastName: "Akissi", role: "secretaire" },
    { firstName: "Moussa", lastName: "Diarra", role: "comptable" },
];

const DEMO_STUDENTS_DATA = [
    { firstName: "Yao", lastName: "Kouadio", gender: "Masculin", dateOfBirth: "2010-05-15", placeOfBirth: "Bouaké", parent1FirstName: "Akissi", parent1LastName: "Kouadio", parent1Contact: "0701020304", grade: "3ème", section: "A" },
    { firstName: "Adjoua", lastName: "Brou", gender: "Féminin", dateOfBirth: "2010-03-20", placeOfBirth: "Abidjan", parent1FirstName: "Koffi", parent1LastName: "Brou", parent1Contact: "0502030405", grade: "3ème", section: "A" },
    { firstName: "Léa", lastName: "Gnahoré", gender: "Féminin", dateOfBirth: "2013-08-10", placeOfBirth: "Gagnoa", parent1FirstName: "Pierre", parent1LastName: "Gnahoré", parent1Contact: "0103040506", grade: "6ème", section: "B" },
    { firstName: "Didier", lastName: "Zokou", gender: "Masculin", dateOfBirth: "2013-07-22", placeOfBirth: "Daloa", parent1FirstName: "Marie-Laure", parent1LastName: "Zokou", parent1Contact: "0704050607", grade: "6ème", section: "B" },
    { firstName: "Amenan", lastName: "N'Guessan", gender: "Féminin", dateOfBirth: "2014-01-11", placeOfBirth: "Yamoussoukro", parent1FirstName: "Jean-Baptiste", parent1LastName: "N'Guessan", parent1Contact: "0505060708", grade: "CM2", section: "C" },
    { firstName: "Amara", lastName: "Cissé", gender: "Masculin", dateOfBirth: "2014-02-18", placeOfBirth: "Korhogo", parent1FirstName: "Fanta", parent1LastName: "Cissé", parent1Contact: "0106070809", grade: "CM2", section: "C" },
    { firstName: "Kouamé", lastName: "Konan", gender: "Masculin", dateOfBirth: "2016-04-05", placeOfBirth: "Dimbokro", parent1FirstName: "Ahou", parent1LastName: "Konan", parent1Contact: "0707080910", grade: "CE2", section: "A" },
    { firstName: "Christelle", lastName: "Gbo", gender: "Féminin", dateOfBirth: "2016-09-30", placeOfBirth: "San-Pédro", parent1FirstName: "David", parent1LastName: "Gbo", parent1Contact: "0508091011", grade: "CE2", section: "A" },
    { firstName: "Ousmane", lastName: "Touré", gender: "Masculin", dateOfBirth: "2017-11-25", placeOfBirth: "Odienné", parent1FirstName: "Kadidja", parent1LastName: "Touré", parent1Contact: "0109101112", grade: "CP1", section: "B" },
    { firstName: "Rokia", lastName: "Traoré", gender: "Féminin", dateOfBirth: "2017-12-01", placeOfBirth: "Ferkessédougou", parent1FirstName: "Hawa", parent1LastName: "Traoré", parent1Contact: "0103040506", grade: "CP1", section: "B" },
    { firstName: "Kouakou", lastName: "N'Dri", gender: "Masculin", dateOfBirth: "2018-06-12", placeOfBirth: "Daoukro", parent1FirstName: "Affoué", parent1LastName: "N'Dri", parent1Contact: "0710111213", grade: "Grande Section", section: "A" },
    { firstName: "Esmel", lastName: "Essis", gender: "Masculin", dateOfBirth: "2013-10-10", placeOfBirth: "Grand-Bassam", parent1FirstName: "Marie-Ange", parent1LastName: "Essis", parent1Contact: "0511121314", grade: "6ème", section: "B" },
    { firstName: "Bintou", lastName: "Konaté", gender: "Féminin", dateOfBirth: "2010-02-28", placeOfBirth: "Man", parent1FirstName: "Oumar", parent1LastName: "Keita", parent1Contact: "0502030405", grade: "3ème", section: "A" },
    { firstName: "Stéphane", lastName: "Zadi", gender: "Masculin", dateOfBirth: "2016-11-19", placeOfBirth: "Guiglo", parent1FirstName: "Juliette", parent1LastName: "Zadi", parent1Contact: "0713141516", grade: "CE2", section: "A" },
    { firstName: "Chantal", lastName: "Eby", gender: "Féminin", dateOfBirth: "2017-08-08", placeOfBirth: "Aboisso", parent1FirstName: "Georges", parent1LastName: "Eby", parent1Contact: "0514151617", grade: "CP1", section: "B" },
];

const DEMO_SUBJECTS_DATA = [
    { name: "Français", code: "FRA", color: "#3B82F6" },
    { name: "Mathématiques", code: "MAT", color: "#10B981" },
    { name: "Histoire-Géographie", code: "HG", color: "#F59E0B" },
    { name: "Anglais", code: "ANG", color: "#EF4444" },
    { name: "Sciences de la Vie et de la Terre (SVT)", code: "#22C55E" },
    { name: "Physique-Chimie", code: "#8B5CF6" },
];

export async function seedDemoData(firestore: Firestore, schoolId: string) {
    const batch = writeBatch(firestore);
    const today = '2023-09-01'; // Fixed date for consistency

    // 1. Seed Cycles
    const cycleIdMap = new Map<string, string>();
    for (const cycle of DEMO_CYCLES_DATA) {
        const cycleRef = doc(collection(firestore, `ecoles/${schoolId}/cycles`));
        batch.set(cycleRef, { ...cycle, schoolId });
        cycleIdMap.set(cycle.name, cycleRef.id);
    }

    // 2. Seed Niveaux
    const niveauIdMap = new Map<string, string>();
    for (const niveau of DEMO_NIVEAUX_DATA) {
        const cycleId = cycleIdMap.get(niveau.cycleName);
        if (cycleId) {
            const niveauRef = doc(collection(firestore, `ecoles/${schoolId}/niveaux`));
            batch.set(niveauRef, { name: niveau.name, code: niveau.code, order: niveau.order, capacity: niveau.capacity, cycleId, schoolId, ageMin: 0, ageMax: 0 });
            niveauIdMap.set(niveau.name, niveauRef.id);
        }
    }

    // 3. Seed Classes
    const classIdMap = new Map<string, string>();
    const studentCountPerClass = new Map<string, number>();
    const classesToCreate = [...new Set(DEMO_STUDENTS_DATA.map(s => `${s.grade}-${s.section}`))]
        .map(name => ({
            grade: name.split('-')[0],
            section: name.split('-')[1],
        }));

    for (const classInfo of classesToCreate) {
        const niveauId = niveauIdMap.get(classInfo.grade);
        const niveauData = DEMO_NIVEAUX_DATA.find(n => n.name === classInfo.grade);
        const cycleId = cycleIdMap.get(niveauData?.cycleName || '');
        if (niveauId && cycleId) {
            const classRef = doc(collection(firestore, `ecoles/${schoolId}/classes`));
            const className = `${classInfo.grade}-${classInfo.section}`;
            batch.set(classRef, {
                schoolId, cycleId, niveauId, name: className, section: classInfo.section,
                code: `${niveauData?.code}${classInfo.section}`, academicYear: '2024-2025',
                studentCount: 0, maxStudents: niveauData?.capacity || 30, status: 'active',
                isFull: false, createdBy: 'system-seed'
            });
            classIdMap.set(className, classRef.id);
            studentCountPerClass.set(classRef.id, 0);
        }
    }

    // 4. Seed Subjects
    for (const subject of DEMO_SUBJECTS_DATA) {
        const subjectRef = doc(collection(firestore, `ecoles/${schoolId}/matieres`));
        batch.set(subjectRef, { ...subject, schoolId });
    }

    // 5. Seed Staff
    const staffEmails = DEMO_STAFF_BASE.map(s => `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@ecole-demo.com`);
    for (const staff of DEMO_STAFF_BASE) {
        const staffRef = doc(collection(firestore, `ecoles/${schoolId}/personnel`));
        batch.set(staffRef, { ...staff, uid: staffRef.id, schoolId, displayName: `${staff.firstName} ${staff.lastName}`, hireDate: today, baseSalary: 150000, status: "Actif" });
    }

    // 6. Seed Students
    let studentCounter = 0;
    for (const student of DEMO_STUDENTS_DATA) {
        studentCounter++;
        const className = `${student.grade}-${student.section}`;
        const classId = classIdMap.get(className);
        if (classId) {
            const studentRef = doc(collection(firestore, `ecoles/${schoolId}/eleves`));
            batch.set(studentRef, {
                ...student, schoolId, classId, class: className,
                matricule: `24-${String(studentCounter).padStart(3, '0')}`,
                status: "Actif", createdAt: serverTimestamp(),
            });
            // Increment student count for the class
            const currentCount = studentCountPerClass.get(classId) || 0;
            studentCountPerClass.set(classId, currentCount + 1);
        }
    }

    // 7. Update student counts in classes
    for (const [classId, count] of studentCountPerClass.entries()) {
        const classDocRef = doc(firestore, `ecoles/${schoolId}/classes/${classId}`);
        batch.update(classDocRef, { studentCount: count });
    }

    await batch.commit();

    // Initialize finance stats after seeding
    try {
        const { initializeFinanceStats } = await import('./stats-initialization');
        await initializeFinanceStats(schoolId);
    } catch (error) {
        console.error("Erreur lors de l'initialisation des stats de finance après seeding:", error);
    }
}
