
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, PlusCircle } from 'lucide-react';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { cycle as Cycle, niveau as Niveau, staff as Staff, class_type as ClassType } from '@/lib/data-types';
import { useSchoolData } from '@/hooks/use-school-data';
import { ClassForm } from './class-form';

export function ClassesList() {
    const { schoolId } = useSchoolData();
    const firestore = useFirestore();
    const { user } = useUser();
    const canManage = !!user?.profile?.permissions?.manageClasses || user?.profile?.role === 'directeur';

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCycle, setSelectedCycle] = useState('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<(ClassType & { id: string }) | null>(null);

    const cyclesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, [schoolId, firestore]);
    const { data: cyclesData } = useCollection(cyclesQuery);
    const cycles = useMemo(() => cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & { id: string })) || [], [cyclesData]);
    
    const allTeachersQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [schoolId, firestore]);
    const allNiveauxQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, [schoolId, firestore]);
    const { data: teachersData } = useCollection(allTeachersQuery);
    const { data: niveauxData } = useCollection(allNiveauxQuery);
    
    const teachers = useMemo(() => teachersData?.map(d => ({ id: d.id, ...d.data() } as Staff & { id: string })) || [], [teachersData]);
    const niveaux = useMemo(() => niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & { id: string })) || [], [niveauxData]);


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
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>Liste des Classes</CardTitle>
                        <CardDescription>Gérez les classes de chaque niveau pour l'année en cours.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Rechercher par nom..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <Select value={selectedCycle} onValueChange={setSelectedCycle}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filtrer par cycle" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les cycles</SelectItem>
                                {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {canManage && (
                            <Button onClick={() => handleOpenForm(null)}>
                                <PlusCircle className="mr-2 h-4 w-4"/>Nouvelle Classe
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
                />
            </DialogContent>
        </Dialog>
        </>
    );
}
