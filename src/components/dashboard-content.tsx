
'use client';

import { useUser } from '@/firebase';
import { LoadingScreen } from "@/components/ui/loading-screen";
import { ParentDashboard } from '@/components/parent/parent-dashboard';
import { RegularDashboard } from '@/components/dashboard/regular-dashboard';

export default function DashboardPageContent() {
    const { user, loading } = useUser();
    
    if (loading) {
        return <LoadingScreen />;
    }
    
    if (user?.isParent) {
        return <ParentDashboard user={user} />;
    }
    
    return <RegularDashboard />;
}
