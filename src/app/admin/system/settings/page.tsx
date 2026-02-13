'use client';
import { SystemSettings } from "@/components/admin/system-settings";

export default function SystemSettingsPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-[#0C365A] font-outfit tracking-tight">Configuration Système</h1>
                <p className="text-slate-500 font-medium mt-1">Paramètres globaux et préférences de la plateforme.</p>
            </div>
            <SystemSettings />
        </div>
    );
}
