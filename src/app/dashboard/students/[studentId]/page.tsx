'use client';

import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Page de Fiche Élève</CardTitle>
          <CardDescription>
            Cette page est un test pour vérifier que la route dynamique fonctionne.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            L'identifiant de l'élève récupéré depuis l'URL est :
          </p>
          <pre className="mt-2 p-4 bg-muted rounded-md font-mono text-sm">
            {studentId || "Aucun ID trouvé dans l'URL."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
