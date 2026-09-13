'use client';

import { useParams } from 'next/navigation';
import { StaffProfileContent } from '@/components/rh/staff-profile-content';

export default function StaffProfileClient() {
    const params = useParams();
    const staffId = params.staffId as string;

    return (
        <StaffProfileContent
            staffId={staffId}
            ficheHref={`/dashboard/rh/${staffId}/fiche`}
            bulletinHref={`/dashboard/rh/${staffId}/bulletin`}
        />
    );
}
