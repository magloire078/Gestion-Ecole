
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolsTable } from '@/components/admin/schools-table';

export default function SchoolsPage() {
    return (
        <Card>
          <CardHeader>
            <CardTitle>Gestion des Écoles</CardTitle>
            <CardDescription>
              Liste complète de toutes les écoles et leur statut sur la plateforme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SchoolsTable />
          </CardContent>
        </Card>
    )
}
