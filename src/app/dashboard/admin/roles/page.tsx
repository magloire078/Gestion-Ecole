
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminRolesPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestion des Rôles et Permissions</CardTitle>
                    <CardDescription>
                        La gestion des permissions est désormais directement liée au rôle de chaque membre du personnel (Directeur, Enseignant, Comptable, etc.).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Cette approche simplifiée et sécurisée garantit que chaque rôle dispose des accès appropriés. Vous pouvez assigner un rôle à chaque membre du personnel depuis la section "Ressources Humaines".
                    </p>
                    <Button asChild>
                        <Link href="/dashboard/rh">
                            Aller à la gestion du personnel
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
