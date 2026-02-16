'use client';

import { notFound, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useDoc, useFirestore } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, type DocumentReference } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { PayslipPreview } from '@/components/payroll/payslip-template';
import type { staff as Staff, school as School } from '@/lib/data-types';
import { getPayslipDetails, type PayslipDetails } from '@/lib/bulletin-de-paie';

function PayslipPageSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
        </div>
    );
}

function StaffPayslipContent({ staffId }: { staffId: string }) {
    const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
    const firestore = useFirestore();

    const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(true);

    const staffRef = useMemo(() =>
        (schoolId && staffId) ? doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`) as DocumentReference<Staff> : null
        , [firestore, schoolId, staffId]);

    const { data: staffData, loading: staffLoading } = useDoc<Staff>(staffRef);

    useEffect(() => {
        if (!staffMember || !schoolData) return;

        const generateDetails = async () => {
            setDetailsLoading(true);
            try {
                const details = await getPayslipDetails(staffMember as Staff, new Date().toISOString(), schoolData as School);
                setPayslipDetails(details);
            } catch (e) {
                console.error("Failed to generate payslip details:", e);
            } finally {
                setDetailsLoading(false);
            }
        };

        generateDetails();

    }, [staffData, schoolData]);

    const staffMember = useMemo(() => staffData ? { ...staffData, id: staffId } as Staff : null, [staffData, staffId]);

    const isLoading = schoolLoading || staffLoading || detailsLoading;

    if (isLoading) {
        return <PayslipPageSkeleton />;
    }

    if (!staffMember) {
        notFound();
    }

    if (!payslipDetails) {
        return (
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Bulletin de Paie</h1>
                <p className="text-muted-foreground">Erreur lors de la génération du bulletin pour {staffMember.firstName} {staffMember.lastName}.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-lg font-semibold md:text-2xl">Bulletin de Paie de {staffMember.firstName} {staffMember.lastName}</h1>
                <p className="text-muted-foreground">Aperçu du bulletin de paie pour la période en cours.</p>
            </div>
            <PayslipPreview details={payslipDetails} />
        </div>
    );
}

export default function StaffPayslipClient() {
    const searchParams = useSearchParams();
    const staffId = searchParams.get('id') as string;

    return (
        <Suspense fallback={<PayslipPageSkeleton />}>
            <StaffPayslipContent staffId={staffId} />
        </Suspense>
    );
}
