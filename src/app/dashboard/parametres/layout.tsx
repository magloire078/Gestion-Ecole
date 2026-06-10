'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { parametresSubLinks } from "@/lib/nav-links";

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

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
          <nav className="flex flex-wrap gap-2 lg:flex-col lg:space-y-1">
            {parametresSubLinks.map((item) => {
              const isActive = pathname === item.href
                || (item.href !== '/dashboard/parametres' && pathname.startsWith(item.href + '/'));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-transform group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )} />
                  {item.label}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-primary rounded-full hidden lg:block" />
                  )}
                </Link>
              );
            })}
          </nav>
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
