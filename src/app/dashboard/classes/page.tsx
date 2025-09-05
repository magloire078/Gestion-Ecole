import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockClassData, mockTeacherData } from "@/lib/data";
import { PlusCircle, Users, User } from "lucide-react";

export default function ClassesPage() {
  const getClassWithMainTeacher = (classId: string) => {
    const classInfo = mockClassData.find(c => c.id === classId);
    if (!classInfo) return { classInfo: null, mainTeacher: null };
    const mainTeacher = mockTeacherData.find(t => t.id === classInfo.mainTeacherId);
    return { classInfo, mainTeacher };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">Gestion des Classes</h1>
          <p className="text-muted-foreground">Créez, visualisez et modifiez les classes de votre école.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une classe
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockClassData.map((cls) => {
          const { mainTeacher } = getClassWithMainTeacher(cls.id);
          return (
            <Card key={cls.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{cls.name}</CardTitle>
                <CardDescription>ID de la classe: {cls.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>Prof. principal: {mainTeacher?.name || 'Non assigné'}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span>{cls.studentCount} élèves</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
