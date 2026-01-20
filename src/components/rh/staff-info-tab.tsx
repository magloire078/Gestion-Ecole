

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building, Bank, Hash, Users, Hand, Calendar } from 'lucide-react';
import type { staff as Staff } from '@/lib/data-types';

interface StaffInfoTabProps {
    staff: Staff;
}

const InfoRow = ({ label, value }: { label: string, value?: string | number | null }) => (
    <div className="grid grid-cols-3 gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold col-span-2">{value || 'N/A'}</span>
    </div>
);

export function StaffInfoTab({ staff }: StaffInfoTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Informations Personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <InfoRow label="Situation matrimoniale" value={staff.situationMatrimoniale} />
                    <InfoRow label="Enfants à charge" value={staff.enfants} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Hand className="h-5 w-5" /> Informations Administratives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <InfoRow label="Catégorie professionnelle" value={staff.categorie} />
                    <InfoRow label="N° CNPS" value={staff.cnpsEmploye} />
                    <InfoRow label="Soumis CNPS" value={staff.CNPS ? 'Oui' : 'Non'} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bank className="h-5 w-5" /> Coordonnées Bancaires</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <InfoRow label="Banque" value={staff.banque} />
                    <InfoRow label="Numéro de compte" value={staff.numeroCompte} />
                    <InfoRow label="Code Banque" value={staff.CB} />
                    <InfoRow label="Code Guichet" value={staff.CG} />
                    <InfoRow label="Clé RIB" value={staff.Cle_RIB} />
                </CardContent>
            </Card>
        </div>
    );
}

    