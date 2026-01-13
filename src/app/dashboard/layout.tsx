'use client';

import { AuthGuard } from "@/components/auth-guard";
import DashboardLayoutContent from "@/components/dashboard-layout-content";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </AuthGuard>
  );
}
