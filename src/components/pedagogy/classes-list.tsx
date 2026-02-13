
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle, LayoutGrid, List } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { staff as Staff, class_type as ClassType } from '@/lib/data-types';
import { useCycles } from '@/hooks/use-cycles';
import { useNiveaux } from '@/hooks/use-niveaux';
import { useSchoolData } from '@/hooks/use-school-data';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { ClassForm } from './class-form'; // Import the new component
import { cn } from '@/lib/utils';

interface ClassesListProps {
    academicYear?: string;
}

export function ClassesList({ academicYear }: ClassesListProps) {
    const { schoolId } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const canManage = !!user?.profile?.permissions?.manageClasses || user?.profile?.role === 'directeur';

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCycle, setSelectedCycle] = useState('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<(ClassType & { id: string }) | null>(null);



    const { cycles } = useCycles(schoolId);
    const { niveaux } = useNiveaux(schoolId);

    // Teachers are still fetched via direct collection, maybe refactor later or invalid data?
    // Maintaining existing teacher logic for now as I didn't create a useTeachers hook.
    const allTeachersQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [schoolId, firestore]);
    const { data: teachersData } = useCollection(allTeachersQuery);

    const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);


    const handleOpenForm = (classe: (ClassType & { id: string }) | null) => {
        setEditingClass(classe);
        setIsFormOpen(true);
    };

    const handleFormSave = () => {
        setIsFormOpen(false);
        setEditingClass(null);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1.5">
                            <CardTitle>Liste des Classes</CardTitle>
                            <CardDescription>Gérez les classes de chaque niveau pour l'année en cours.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Rechercher par nom..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2 w-full">
                                <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Filtrer par cycle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les cycles</SelectItem>
                                        {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={() => setViewMode('list')} className={cn(viewMode === 'list' && 'bg-accent')}>
                                        <List className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => setViewMode('grid')} className={cn(viewMode === 'grid' && 'bg-accent')}>
                                        <LayoutGrid className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            {canManage && (
                                <Button onClick={() => handleOpenForm(null)} className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" />Nouvelle Classe
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {viewMode === 'grid' ? (
                        <ClassesGridView cycleId={selectedCycle} searchQuery={searchQuery} onEdit={handleOpenForm} />
                    ) : (
                        <ClassesListView cycleId={selectedCycle} searchQuery={searchQuery} onEdit={handleOpenForm} />
                    )}
                </CardContent>
            </Card>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingClass ? 'Modifier la classe' : 'Nouvelle Classe'}</DialogTitle>
                        <DialogDescription>{editingClass ? `Modification de la classe ${editingClass.name}` : "Créez une nouvelle classe pour l'année en cours."}</DialogDescription>
                    </DialogHeader>
                    <ClassForm
                        schoolId={schoolId!}
                        cycles={cycles}
                        niveaux={niveaux}
                        teachers={teachers}
                        classe={editingClass}
                        onSave={handleFormSave}
                        academicYear={academicYear}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
