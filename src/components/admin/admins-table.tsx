
// src/components/admin/admins-table.tsx
'use client';
import { useMemo, useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { SafeImage } from '../ui/safe-image';
import type { UserProfile } from '@/lib/data-types';

// Note: This component now relies on the `isAdmin` flag in the Firestore profile,
// which is a fallback. The proper check is done via custom claims in use-user.tsx
// To get a full list of admins based on custom claims, a backend function would be required.
export function AdminsTable() {
  const firestore = useFirestore();
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdmins = async () => {
      if (!firestore) return;
      setLoading(true);
      try {
        // This query finds users who have the isAdmin flag set in their profile,
        // which acts as a fallback or secondary indicator.
        const personnelQuery = query(collectionGroup(firestore, 'personnel'), where('isAdmin', '==', true));
        const querySnapshot = await getDocs(personnelQuery);
        const adminList: UserProfile[] = [];
        querySnapshot.forEach(doc => {
            adminList.push({ id: doc.id, ...doc.data() } as UserProfile);
        });
        setAdmins(adminList);
      } catch (error) {
        console.error("Error fetching admins:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, [firestore]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Administrateurs de la Plateforme</CardTitle>
        <CardDescription>Liste des utilisateurs ayant des privilèges de super administrateur.</CardDescription>
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
            {loading ? (
                [...Array(1)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                ))
            ) : admins.length > 0 ? (
                admins.map(admin => (
                    <TableRow key={admin.uid}>
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
                        <TableCell className="font-mono text-xs">{admin.uid}</TableCell>
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
