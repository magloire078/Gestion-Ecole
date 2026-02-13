'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users } from 'lucide-react';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { ParentStudentCard } from '@/components/parent/student-card';
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Portail Parent</h1>
      <AnnouncementBanner />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Mes Enfants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Cliquez sur un enfant pour voir ses informations détaillées.</p>
          <div className="space-y-4">
            {user.parentStudentIds.map((studentId: string) => (
              <ParentStudentCard
                key={studentId}
                schoolId={user.schoolId!}
                studentId={studentId}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
