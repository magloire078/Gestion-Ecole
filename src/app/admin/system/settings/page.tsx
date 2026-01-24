'use client';
import { SystemSettings } from "@/components/admin/system-settings";

export default function SystemSettingsPage() {
    return (
        <div className="space-y-6">
             <h1 className="text-2xl font-bold">Paramètres Système</h1>
             <SystemSettings />
        </div>
    );
}
