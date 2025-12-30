
'use client';
import { redirect } from 'next/navigation';

// Renamed to /bulletin, this is for backwards compatibility.
export default function StaffPayslipPageRedirect() {
    redirect('../bulletin');
}
