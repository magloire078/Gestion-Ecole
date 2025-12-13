import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('schoolId');
    const cycleId = searchParams.get('cycleId');
    const niveauId = searchParams.get('niveauId');
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId requis' },
        { status: 400 }
      );
    }
    
    const firestore = getFirestore();
    let classesQuery = collection(firestore, `ecoles/${schoolId}/classes`);
    
    // Appliquer les filtres
    const constraints = [];
    if (cycleId) constraints.push(where('cycleId', '==', cycleId));
    if (niveauId) constraints.push(where('niveauId', '==', niveauId));
    
    const q = constraints.length > 0 
      ? query(classesQuery, ...constraints)
      : classesQuery;
    
    const snapshot = await getDocs(q);
    const classes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({ classes });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des classes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, ...classData } = body;
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId requis' },
        { status: 400 }
      );
    }
    
    // Validation des données
    const requiredFields = ['name', 'code', 'cycleId', 'niveauId', 'academicYear'];
    for (const field of requiredFields) {
      if (!classData[field]) {
        return NextResponse.json(
          { error: `Le champ ${field} est requis` },
          { status: 400 }
        );
      }
    }
    
    const firestore = getFirestore();
    
    // Vérifier si le code existe déjà
    const existingQuery = query(
      collection(firestore, `ecoles/${schoolId}/classes`),
      where('code', '==', classData.code),
      where('academicYear', '==', classData.academicYear)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'Une classe avec ce code existe déjà pour cette année scolaire' },
        { status: 409 }
      );
    }
    
    // Ajouter la classe
    const docRef = await addDoc(
      collection(firestore, `ecoles/${schoolId}/classes`),
      {
        ...classData,
        studentCount: 0,
        isFull: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
    
    return NextResponse.json({
      id: docRef.id,
      message: 'Classe créée avec succès'
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la création de la classe' },
      { status: 500 }
    );
  }
}
