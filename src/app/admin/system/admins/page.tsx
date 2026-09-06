// src/app/admin/system/admins/page.tsx
'use client';
import { AdminsTable } from "@/components/admin/admins-table";
import { CommercialAccessTable } from "@/components/admin/commercial-access-table";

export default function AdminsPage() {
    return (
        <div className="space-y-8">
            <AdminsTable />
            <CommercialAccessTable />
        </div>
    );
}
