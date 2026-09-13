'use client';

import { useParams } from 'next/navigation';
import { StaffSheetContent } from '@/components/rh/staff-sheet-content';

export default function StaffSheetClient() {
    const params = useParams();
    const staffId = params.staffId as string;

    return <StaffSheetContent staffId={staffId} />;
}
