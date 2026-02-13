
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullAuditLog } from '@/components/admin/full-audit-log';

export default function AuditLogPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-[#0C365A] font-outfit tracking-tight">Journaux d'Audit Système</h1>
                <p className="text-slate-500 font-medium mt-1">Historique complet des actions critiques effectuées sur la plateforme.</p>
            </div>
            <FullAuditLog />
        </div>
    )
}
