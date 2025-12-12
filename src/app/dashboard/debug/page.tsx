
'use client';

import { useSchoolDataTest } from '@/hooks/use-school-data-test';

export default function DebugPage() {
  const { schoolData, schoolId, loading, error } = useSchoolDataTest();

  if (loading) return <div className="p-6">Chargement...</div>;
  if (error) return <div className="p-6 text-red-600">Erreur: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Debug - Données de l'école</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg space-y-3">
        <div>
          <strong>School ID:</strong> {schoolId || 'Non trouvé'}
        </div>
        
        <div>
          <strong>Données de l'école:</strong>
          <pre className="bg-white p-3 mt-2 rounded overflow-auto">
            {JSON.stringify(schoolData, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Prochaines étapes:</strong>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>Vérifiez que l'utilisateur est connecté</li>
            <li>Vérifiez que le document utilisateur existe dans Firestore</li>
            <li>Vérifiez que le champ 'schoolId' existe dans le document utilisateur</li>
            <li>Vérifiez que le document école existe avec cet ID</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
