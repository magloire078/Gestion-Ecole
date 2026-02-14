'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CreditCard, Utensils, Calendar, ShieldCheck, Star } from 'lucide-react';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { ParentStudentCard } from '@/components/parent/student-card';
import { AnimatedHighlight } from '@/components/ui/animated-highlight';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { AppUser } from '@/lib/data-types';

interface ParentDashboardProps {
  user: NonNullable<AppUser>;
}

export const ParentDashboard = ({ user }: ParentDashboardProps) => {
  if (!user.schoolId) {
    return (
      <Alert>
        <AlertDescription>
          Session parent invalide. Veuillez vous reconnecter.
        </AlertDescription>
      </Alert>
    );
  }

  if (!user.parentStudentIds || user.parentStudentIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Portail Parent</h1>
        <AnnouncementBanner />
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun élève n'est associé à votre session. Veuillez contacter l'administration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Header Banner */}
      <div className="relative w-full h-48 md:h-60 overflow-hidden rounded-3xl shadow-2xl group border border-white/10">
        <AnimatedHighlight />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C365A] via-[#0C365A]/90 to-blue-900/40 z-10" />
        <div className="absolute inset-0 bg-[url('/custom-assets/parent-hero.png')] bg-cover bg-center mix-blend-overlay opacity-30 transition-transform duration-1000 group-hover:scale-110" />

        <div className="absolute inset-0 z-20 flex flex-col justify-center px-8 md:px-12">
          <Badge className="w-fit mb-4 bg-blue-500/20 text-blue-100 border-blue-400/30 backdrop-blur-md">
            Portail Parent Premium
          </Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-3 drop-shadow-xl">
            Bienvenue, <span className="text-blue-200">{user.displayName || 'Parent'}</span>
          </h1>
          <p className="text-blue-100/80 text-lg font-medium max-w-xl drop-shadow-md">
            Suivez l'excellence académique et le bien-être de vos enfants en temps réel.
          </p>
        </div>
      </div>

      <AnnouncementBanner />

      {/* Quick Access Mobile Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/30 transition-all hover:shadow-md" asChild>
          <Link href="/dashboard/parent/cantine">
            <Utensils className="h-6 w-6 text-orange-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Cantine</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/30 transition-all hover:shadow-md">
          <Calendar className="h-6 w-6 text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Agenda</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/30 transition-all hover:shadow-md">
          <CreditCard className="h-6 w-6 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Paiements</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 rounded-2xl border-primary/10 hover:border-primary/30 transition-all hover:shadow-md">
          <ShieldCheck className="h-6 w-6 text-purple-500" />
          <span className="text-xs font-bold uppercase tracking-wider">Sécurité</span>
        </Button>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Star className="h-6 w-6 text-blue-600 fill-blue-600" />
            </div>
            Mes Enfants
          </h2>
          <Badge variant="outline" className="px-3 py-1 font-semibold rounded-full border-blue-100 bg-blue-50/30 text-blue-700">
            {user.parentStudentIds.length} Inscrit(s)
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {user.parentStudentIds.map((studentId: string) => (
            <ParentStudentCard
              key={studentId}
              schoolId={user.schoolId!}
              studentId={studentId}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
