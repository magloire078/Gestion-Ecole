
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullAuditLog } from '@/components/admin/full-audit-log';

export default function AuditLogPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Journaux d'Audit Système</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Historique complet des actions</CardTitle>
                    <CardDescription>
                        Liste de toutes les actions critiques effectuées sur la plateforme, avec pagination.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FullAuditLog />
                </CardContent>
            </Card>
        </div>
    )
}
