
'use client';

import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, Menu, Search } from 'lucide-react';
import { MobileNav } from '@/components/mobile-nav';
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth-guard';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full flex-col bg-background print:bg-white">
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-gray-900 text-white sm:flex print:hidden">
          <div className="flex h-[60px] items-center border-b border-gray-700/50 px-6">
            <Logo />
          </div>
          <MainNav />
        </aside>
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64 print:p-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 print:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-xs p-0 bg-gray-900 text-white border-r-0">
                <MobileNav />
              </SheetContent>
            </Sheet>
            <div className="hidden lg:block w-96">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Rechercher élèves, documents..."
                  className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-0 -right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-background">
                  3
                </span>
              </Button>
              <UserNav />
            </div>
          </header>
          <main className="flex-1 p-4 sm:px-6 sm:py-0 print:p-0">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
