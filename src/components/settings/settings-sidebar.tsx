'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { parametresSubLinks } from "@/lib/nav-links";

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row lg:flex-col gap-1.5 sm:gap-2 overflow-x-auto p-1.5 sm:p-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl shadow-sm w-full">
      {parametresSubLinks.map((item) => {
        const isActive = pathname === item.href
          || (item.href !== '/dashboard/parametres' && pathname.startsWith(item.href + '/'));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 group whitespace-nowrap",
              isActive
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Icon className={cn(
              "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
              isActive ? "text-white" : "text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
            )} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
