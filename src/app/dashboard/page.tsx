
import { AnnouncementBanner } from '@/components/announcement-banner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookUser, BookOpen } from 'lucide-react';
import { mockStudentData, mockTeacherData, mockClassData, mockLibraryData } from '@/lib/data';
import { PerformanceChart } from '@/components/performance-chart';

export default function DashboardPage() {
  const stats = [
    { title: 'Élèves', value: mockStudentData.length, icon: Users, color: 'text-sky-500' },
    { title: 'Enseignants', value: mockTeacherData.length, icon: Users, color: 'text-emerald-500' },
    { title: 'Classes', value: mockClassData.length, icon: BookUser, color: 'text-amber-500' },
    { title: 'Livres', value: mockLibraryData.reduce((sum, book) => sum + book.quantity, 0), icon: BookOpen, color: 'text-violet-500' }
  ];

  return (
    <div className="space-y-6">
       <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Tableau de bord</h1>
      </div>
      <AnnouncementBanner />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">Total dans l'école</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
          <PerformanceChart />
          <Card className="col-span-1 lg:col-span-3">
              <CardHeader>
                  <CardTitle>Activité Récente</CardTitle>
                  <CardDescription>Dernières actions et notifications.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full"><Users className="h-4 w-4" /></div>
                        <p className="text-sm text-muted-foreground">Nouvel élève, <strong>Alice Durand</strong>, ajouté à la classe <strong>Terminale A</strong>.</p>
                      </div>
                       <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full"><BookUser className="h-4 w-4" /></div>
                        <p className="text-sm text-muted-foreground">La classe <strong>Terminale B</strong> a été mise à jour par <strong>Mme. Martin</strong>.</p>
                      </div>
                       <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full"><BookOpen className="h-4 w-4" /></div>
                        <p className="text-sm text-muted-foreground">5 copies de <strong>"Les Misérables"</strong> ont été ajoutées à la bibliothèque.</p>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
