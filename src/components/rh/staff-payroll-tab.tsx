'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Banknote, Car, Hand, Home, Landmark, Phone, Presentation } from 'lucide-react';
import type { staff as Staff } from '@/lib/data-types';

interface StaffPayrollTabProps {
    staff: Staff;
}

const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number') return '0 CFA';
    return `${value.toLocaleString('fr-FR')} CFA`;
};

const InfoRow = ({ label, value, icon: Icon }: { label: string, value?: string | number | null, icon?: React.ElementType }) => (
    <div className="flex justify-between items-center text-sm py-2">
        <div className="flex items-center gap-3">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-semibold">{typeof value === 'number' ? formatCurrency(value) : (value || 'N/A')}</span>
    </div>
);

export function StaffPayrollTab({ staff }: StaffPayrollTabProps) {
    const earnings = [
        { label: 'Salaire de base', value: staff.baseSalary, icon: Landmark },
        { label: 'Indemnité de transport (imposable)', value: staff.indemniteTransportImposable, icon: Car },
        { label: 'Indemnité de logement', value: staff.indemniteLogement, icon: Home },
        { label: 'Indemnité de sujétion', value: staff.indemniteSujetion, icon: Hand },
        { label: 'Indemnité de responsabilité', value: staff.indemniteResponsabilite, icon: Hand },
        { label: 'Indemnité de communication', value: staff.indemniteCommunication, icon: Phone },
        { label: 'Indemnité de représentation', value: staff.indemniteRepresentation, icon: Presentation },
    ];

    const totalBrut = earnings.reduce((acc, curr) => acc + (curr.value || 0), 0);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Informations de Paie</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    {earnings.map(earning => (
                        earning.value > 0 && <InfoRow key={earning.label} label={earning.label} value={earning.value} icon={earning.icon} />
                    ))}
                     <InfoRow key="base" label="Salaire de base" value={staff.baseSalary || 0} icon={Landmark} />
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center font-bold text-base pt-2">
                        <span>Total Brut Mensuel (estimé)</span>
                        <span>{formatCurrency(totalBrut)}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
