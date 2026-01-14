
'use client';

import { redirect } from 'next/navigation';

// This page is obsolete. The functionality is now handled by /dashboard/pedagogie/structure
// We redirect to ensure old bookmarks or links still work.
export default function DeprecatedClassesPage() {
    redirect('/dashboard/pedagogie/structure');
}
