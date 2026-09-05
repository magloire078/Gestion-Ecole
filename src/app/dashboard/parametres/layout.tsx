import { Separator } from "@/components/ui/separator";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Paramètres</h2>
        <p className="text-muted-foreground text-lg">
          Configurez et gérez votre établissement scolaire.
        </p>
      </div>
      <Separator className="my-6 opacity-50" />
      <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-8 lg:space-y-0">
        <aside className="lg:w-56 shrink-0">
          <SettingsSidebar />
        </aside>
        <div className="flex-1 min-w-0 w-full">
          <div className="rounded-2xl border border-white/60 bg-white/40 backdrop-blur-xl p-1 md:p-6 shadow-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
