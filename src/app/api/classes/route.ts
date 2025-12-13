'use server';
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';

// Initialize Firestore through admin
const firestore = getFirestore(adminApp);

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
    const requiredFields = ['name', 'code', 'cycleId', 'niveauId', 'academicYear', 'maxStudents'];
    for (const field of requiredFields) {
      if (!classData[field]) {
        return NextResponse.json(
          { error: `Le champ ${field} est requis` },
          { status: 400 }
        );
      }
    }
    
    // Vérifier si le code existe déjà pour cette année scolaire
    const classesRef = firestore.collection(`ecoles/${schoolId}/classes`);
    const existingQuery = classesRef
        .where('code', '==', classData.code)
        .where('academicYear', '==', classData.academicYear);
    
    const existingSnapshot = await existingQuery.get();

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'Une classe avec ce code existe déjà pour cette année scolaire.' },
        { status: 409 } // 409 Conflict
      );
    }
    
    // Ajouter la classe
    const docRef = await classesRef.add({
      ...classData,
      studentCount: 0,
      isFull: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return NextResponse.json({
      id: docRef.id,
      message: 'Classe créée avec succès'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Erreur API lors de la création de la classe:", error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
