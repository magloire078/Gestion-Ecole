
'use client';

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarNavItems = [
  {
    title: "Général",
    href: "/dashboard/parametres",
  },
  {
    title: "Abonnement",
    href: "/dashboard/parametres/abonnement",
  },
  {
    title: "Facturation",
    href: "/dashboard/parametres/facturation",
  },
  {
    title: "Année Scolaire",
    href: "/dashboard/parametres/annee-scolaire",
  },
  {
    title: "Fiche Établissement",
    href: "/dashboard/parametres/fiche-etablissement",
  },
    {
    title: "Vérification des Données",
    href: "/dashboard/parametres/donnees",
  },
]

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre établissement.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "inline-flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground px-4 py-2",
                    pathname === item.href
                    ? "bg-muted"
                    : "hover:bg-transparent hover:underline"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-4xl">{children}</div>
      </div>
    </div>
  )
}
