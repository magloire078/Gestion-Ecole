'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { parametresSubLinks } from "@/lib/nav-links";

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
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
  );
}
