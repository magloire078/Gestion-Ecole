
'use client';

import { redirect } from 'next/navigation';

export default function AnalyticsPage() {
    // This page is now obsolete, all analytics are on the main dashboard.
    // We redirect to ensure old bookmarks or links still work.
    redirect('/dashboard');
}
