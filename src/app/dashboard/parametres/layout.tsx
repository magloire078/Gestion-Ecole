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
      <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/4">
          <SettingsSidebar />
        </aside>
        <div className="flex-1 min-w-0 max-w-full lg:max-w-5xl">
          <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-1 md:p-6 shadow-xl shadow-primary/5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
