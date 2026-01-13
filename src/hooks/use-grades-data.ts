
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import type { gradeEntry as GradeEntry } from '@/lib/data-types';

export const useGradesData = (schoolId?: string | null) => {
  const firestore = useFirestore();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || !firestore) {
      setLoading(false);
      return;
    }

    const fetchGrades = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const gradesCollectionGroup = collectionGroup(firestore, 'notes');
        const gradesQuery = query(
          gradesCollectionGroup,
          where('__name__', '>=', `ecoles/${schoolId}/`),
          where('__name__', '<', `ecoles/${schoolId}￿`),
          limit(500)
        );
        
        const gradesSnapshot = await getDocs(gradesQuery);
        const fetchedGrades: GradeEntry[] = [];
        
        gradesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data && data.subject && typeof data.grade === 'number' && typeof data.coefficient === 'number') {
             fetchedGrades.push({
              ...data,
              id: doc.id,
              date: data.date,
            } as GradeEntry);
          }
        });
        
        setGrades(fetchedGrades);
      } catch (err) {
        console.error("Erreur lors de la récupération des notes:", err);
        setError("Impossible de charger les données des notes");
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [schoolId, firestore]);

  return { grades, loading, error };
};
