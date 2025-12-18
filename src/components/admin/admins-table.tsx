// src/components/admin/admins-table.tsx
'use client';
import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { SafeImage } from '../ui/safe-image';

interface SuperAdmin {
    id: string;
    displayName: string;
    email: string;
    photoURL?: string;
}

export function AdminsTable() {
  const firestore = useFirestore();

  const adminsQuery = useMemoFirebase(() => query(collection(firestore, 'super_admins')), [firestore]);
  const { data: adminsData, loading: adminsLoading } = useCollection(adminsQuery);
  
  const admins: SuperAdmin[] = useMemo(() => adminsData?.map(doc => ({ id: doc.id, ...doc.data() } as SuperAdmin)) || [], [adminsData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Administrateurs de la Plateforme</CardTitle>
        <CardDescription>Liste des utilisateurs ayant les droits de super administrateur.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Administrateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>ID Utilisateur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adminsLoading ? (
                [...Array(1)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : admins.length > 0 ? (
                admins.map(admin => (
                    <TableRow key={admin.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <SafeImage src={admin.photoURL} alt={admin.displayName} />
                                    <AvatarFallback>{admin.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{admin.displayName}</span>
                            </div>
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell className="font-mono text-xs">{admin.id}</TableCell>
                        <TableCell className="text-right">
                             <Button variant="ghost" size="sm" disabled>
                               <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Révocation bientôt disponible
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">Aucun super administrateur trouvé.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
