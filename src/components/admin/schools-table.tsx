'use client';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Database } from 'lucide-react';
import { format } from 'date-fns';

export function SchoolsTable() {
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm">
            Filtrer
          </Button>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une école manuellement
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>École</TableHead>
            <TableHead>Directeur</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Créée le</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.length > 0 ? schools.map(school => (
            <TableRow key={school.id}>
              <TableCell>
                <div className="font-medium">{school.name}</div>
                <div className="text-sm text-muted-foreground">
                  {school.studentsCount} élèves • {school.teachersCount} enseignants
                </div>
              </TableCell>
              <TableCell>
                <div>{school.directorName}</div>
                <div className="text-sm text-muted-foreground">{school.directorEmail}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{school.plan}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={
                  school.status === 'active' ? 'secondary' :
                  school.status === 'suspended' ? 'destructive' : 'outline'
                }>
                  {school.status}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(school.createdAt), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSchool(school)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Database className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Aucune école trouvée.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* Modal de détail */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-card p-6 rounded-lg w-full max-w-lg">
                <h2 className="text-lg font-bold">{selectedSchool.name}</h2>
                <Button onClick={() => setSelectedSchool(null)}>Fermer</Button>
            </div>
        </div>
      )}
    </div>
  );
}

    