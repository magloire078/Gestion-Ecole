
'use client';

import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { PayslipPreview } from '@/components/payroll/payslip-template';
import type { staff as Staff, school as School } from '@/lib/data-types';
import { getPayslipDetails, type PayslipDetails } from '@/lib/bulletin-de-paie';
import { useEffect, useState } from 'react';

function PayslipPageSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[70vh] w-full max-w-4xl mx-auto" />
        </div>
    );
}

export default function StaffPayslipPage() {
  const params = useParams();
  const staffId = params.staffId as string;
  const { schoolId, schoolData, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  const [payslipDetails, setPayslipDetails] = useState<PayslipDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);

  const staffRef = useMemoFirebase(() =>
    (schoolId && staffId) ? doc(firestore, `ecoles/${schoolId}/personnel/${staffId}`) : null
  , [firestore, schoolId, staffId]);

  const { data: staffData, loading: staffLoading } = useDoc<Staff>(staffRef);

  useEffect(() => {
    if (!staffData || !schoolData) return;

    const generateDetails = async () => {
        setDetailsLoading(true);
        try {
            const details = await getPayslipDetails(staffData as Staff, new Date().toISOString(), schoolData as School);
            setPayslipDetails(details);
        } catch(e) {
            console.error("Failed to generate payslip details:", e);
        } finally {
            setDetailsLoading(false);
        }
    };

    generateDetails();

  }, [staffData, schoolData]);

  const isLoading = schoolLoading || staffLoading || detailsLoading;

  if (isLoading) {
    return <PayslipPageSkeleton />;
  }

  if (!staffData) {
    notFound();
  }

  if (!payslipDetails) {
    return (
        <div>
            <h1 className="text-lg font-semibold md:text-2xl">Bulletin de Paie</h1>
            <p className="text-muted-foreground">Erreur lors de la génération du bulletin pour {staffData.firstName} {staffData.lastName}.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Bulletin de Paie de {staffData.firstName} {staffData.lastName}</h1>
        <p className="text-muted-foreground">Aperçu du bulletin de paie pour la période en cours.</p>
      </div>
      <PayslipPreview details={payslipDetails} />
    </div>
  );
}
