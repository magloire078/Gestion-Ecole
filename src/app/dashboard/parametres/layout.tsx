import { SettingsSidebar } from "@/components/settings/settings-sidebar";

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-1.5 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/60 dark:border-slate-800/60 shadow-sm">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">
            Administration & Configuration
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">
          Paramètres de l&apos;Établissement
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
          Configurez et gérez l&apos;ensemble des informations, préférences et modules de votre établissement scolaire.
        </p>
      </div>

      <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-6 lg:space-y-0 items-start">
        <aside className="w-full lg:w-64 shrink-0">
          <SettingsSidebar />
        </aside>
        <div className="flex-1 min-w-0 w-full">
          <div className="rounded-2xl border border-white/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-3.5 sm:p-6 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
