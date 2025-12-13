'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  LayoutGrid,
  List,
  Plus,
  Filter,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useSchoolData } from '@/hooks/use-school-data';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { cycle as Cycle, niveau as Niveau } from '@/lib/data-types';

export default function StructurePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCycleFilter, setActiveCycleFilter] = useState<string>('all');
  const [selectedCycleForNiveaux, setSelectedCycleForNiveaux] = useState<string>('all');
  const [selectedCycleForDisplay, setSelectedCycleForDisplay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const firestore = useFirestore();

  // --- Data Fetching ---
  const cyclesQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/cycles`)) : null, 
    [schoolId]
  );
  
  const niveauxQuery = useMemoFirebase(() => 
    schoolId ? query(collection(firestore, `ecoles/${schoolId}/niveaux`)) : null, 
    [schoolId]
  );
  
  const { data: cyclesData, loading: cyclesLoading } = useCollection(cyclesQuery);
  const { data: niveauxData, loading: niveauxLoading } = useCollection(niveauxQuery);

  // Transform data
  const cycles: (Cycle & {id: string})[] = useMemo(() => 
    cyclesData?.map(d => ({ id: d.id, ...d.data() } as Cycle & {id: string})) || [], 
    [cyclesData]
  );
  
  const niveaux: (Niveau & {id: string})[] = useMemo(() => 
    niveauxData?.map(d => ({ id: d.id, ...d.data() } as Niveau & {id: string})) || [], 
    [niveauxData]
  );

  // Create cycle map for quick lookup
  const cycleMap = useMemo(() => 
    new Map(cycles.map(c => [c.id, c])), 
    [cycles]
  );

  // Filter niveaux based on selected cycle
  const filteredNiveaux = useMemo(() => {
    if (selectedCycleForNiveaux === 'all') return niveaux;
    return niveaux.filter(n => n.cycleId === selectedCycleForNiveaux);
  }, [niveaux, selectedCycleForNiveaux]);

  // Group niveaux by cycle for display
  const niveauxByCycle = useMemo(() => {
    const grouped: Record<string, (Niveau & {id: string})[]> = {};
    
    // Initialize with all cycles
    cycles.forEach(cycle => {
      grouped[cycle.id] = [];
    });
    
    // Add an "all" group for unassigned niveaux
    grouped['unassigned'] = [];
    
    // Distribute niveaux
    niveaux.forEach(niveau => {
      if (cycleMap.has(niveau.cycleId)) {
        if (!grouped[niveau.cycleId]) {
          grouped[niveau.cycleId] = [];
        }
        grouped[niveau.cycleId].push(niveau);
      } else {
        grouped['unassigned'].push(niveau);
      }
    });
    
    return grouped;
  }, [niveaux, cycles, cycleMap]);

  // Filtered cycles for display (with search)
  const filteredCycles = useMemo(() => {
    if (!searchQuery) return cycles;
    return cycles.filter(cycle => 
      cycle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cycle.code && cycle.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [cycles, searchQuery]);

  // Filtered niveaux for display (with search)
  const filteredNiveauxDisplay = useMemo(() => {
    if (!searchQuery) return filteredNiveaux;
    return filteredNiveaux.filter(niveau => 
      niveau.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (niveau.code && niveau.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [filteredNiveaux, searchQuery]);

  // Effect to update filtered niveaux when cycle changes
  useEffect(() => {
    if (selectedCycleForDisplay && selectedCycleForDisplay !== 'all') {
      const niveauxForCycle = niveauxByCycle[selectedCycleForDisplay];
      if (niveauxForCycle && niveauxForCycle.length > 0) {
        setSelectedCycleForNiveaux(selectedCycleForDisplay);
      }
    }
  }, [selectedCycleForDisplay, niveauxByCycle]);

  const isLoading = schoolLoading || cyclesLoading || niveauxLoading;

  const handleCycleSelect = (cycleId: string) => {
    setSelectedCycleForNiveaux(cycleId);
    setSelectedCycleForDisplay(cycleId);
  };

  const handleAddCycle = () => {
    toast({
      title: "Création de cycle",
      description: "Fonctionnalité à implémenter",
    });
  };

  const handleAddNiveau = () => {
    toast({
      title: "Création de niveau",
      description: "Fonctionnalité à implémenter",
    });
  };

  const handleEditCycle = (cycleId: string) => {
    toast({
      title: "Modification de cycle",
      description: `Modification du cycle ${cycleId}`,
    });
  };

  const handleEditNiveau = (niveauId: string) => {
    toast({
      title: "Modification de niveau",
      description: `Modification du niveau ${niveauId}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Structure Pédagogique</h1>
        <p className="text-muted-foreground">
          Organisez les cycles, niveaux et classes de votre établissement.
        </p>
      </div>

      <Tabs defaultValue="cycles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="niveaux">Niveaux</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>
        
        {/* TAB: Cycles */}
        <TabsContent value="cycles" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des Cycles</CardTitle>
                  <CardDescription>
                    Définissez les cycles d'enseignement de votre établissement
                  </CardDescription>
                </div>
                <Button onClick={handleAddCycle} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Cycle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher un cycle..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Cycles Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du Cycle</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Ordre</TableHead>
                      <TableHead>Niveaux</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={5}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredCycles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Aucun cycle trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCycles
                        .sort((a, b) => a.order - b.order)
                        .map((cycle) => (
                          <TableRow key={cycle.id} className="group hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                />
                                {cycle.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{cycle.code}</Badge>
                            </TableCell>
                            <TableCell>{cycle.order}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {niveauxByCycle[cycle.id]?.length || 0} niveau(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCycle(cycle.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedCycleForDisplay(cycle.id)}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Cycle Details Accordion */}
              {selectedCycleForDisplay && cycleMap.has(selectedCycleForDisplay) && (
                <Accordion type="single" collapsible defaultValue="details">
                  <AccordionItem value="details">
                    <AccordionTrigger className="px-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                        />
                        <span className="font-medium">
                          {cycleMap.get(selectedCycleForDisplay)?.name} - Niveaux associés
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {niveauxByCycle[selectedCycleForDisplay]?.length || 0} niveau(s)
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="space-y-3">
                        {niveauxByCycle[selectedCycleForDisplay]?.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            Aucun niveau n'est associé à ce cycle
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {niveauxByCycle[selectedCycleForDisplay]
                              ?.sort((a, b) => a.order - b.order)
                              .map((niveau) => (
                                <div
                                  key={niveau.id}
                                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium">{niveau.name}</div>
                                    <Badge variant="outline">{niveau.code}</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <div>Ordre: {niveau.order}</div>
                                    {niveau.ageMin && niveau.ageMax && (
                                      <div>Âge: {niveau.ageMin}-{niveau.ageMax} ans</div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleEditNiveau(niveau.id)}
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Modifier
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        setSelectedCycleForNiveaux('all');
                                        setSelectedCycleForDisplay(null);
                                      }}
                                    >
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                      Masquer
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                        <div className="pt-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedCycleForDisplay(null)}
                          >
                            Fermer les détails
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Niveaux */}
        <TabsContent value="niveaux" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des Niveaux</CardTitle>
                  <CardDescription>
                    Définissez les niveaux d'enseignement et associez-les aux cycles
                  </CardDescription>
                </div>
                <Button onClick={handleAddNiveau} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Niveau
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher un niveau..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedCycleForNiveaux}
                    onValueChange={handleCycleSelect}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrer par cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les cycles</SelectItem>
                      {cycles
                        .sort((a, b) => a.order - b.order)
                        .map((cycle) => (
                          <SelectItem key={cycle.id} value={cycle.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                              />
                              {cycle.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Niveaux Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du Niveau</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Ordre</TableHead>
                      <TableHead>Âge</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : filteredNiveauxDisplay.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {selectedCycleForNiveaux === 'all' 
                            ? 'Aucun niveau trouvé' 
                            : `Aucun niveau trouvé pour le cycle sélectionné`}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNiveauxDisplay
                        .sort((a, b) => a.order - b.order)
                        .map((niveau) => {
                          const cycle = cycleMap.get(niveau.cycleId);
                          return (
                            <TableRow key={niveau.id} className="group hover:bg-muted/50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{niveau.code}</Badge>
                                  {niveau.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="px-2 py-1 bg-muted rounded text-xs">
                                  {niveau.code}
                                </code>
                              </TableCell>
                              <TableCell>
                                {cycle ? (
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-2 h-2 rounded-full"
                                    />
                                    <span>{cycle.name}</span>
                                  </div>
                                ) : (
                                  <Badge variant="destructive">Cycle manquant</Badge>
                                )}
                              </TableCell>
                              <TableCell>{niveau.order}</TableCell>
                              <TableCell>
                                {niveau.ageMin && niveau.ageMax ? (
                                  <span>{niveau.ageMin}-{niveau.ageMax} ans</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditNiveau(niveau.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (cycle) {
                                        setSelectedCycleForDisplay(cycle.id);
                                      }
                                    }}
                                    disabled={!cycle}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Niveaux</p>
                        <p className="text-2xl font-bold">{niveaux.length}</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          N
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Cycles utilisés</p>
                        <p className="text-2xl font-bold">
                          {new Set(niveaux.map(n => n.cycleId)).size}
                        </p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-lg">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          C
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Niveaux sans cycle</p>
                        <p className="text-2xl font-bold">
                          {niveaux.filter(n => !cycleMap.has(n.cycleId)).length}
                        </p>
                      </div>
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          !
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Classes */}
        <TabsContent value="classes" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher une classe..." className="pl-10" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>
              <Button asChild>
                <Link href="/dashboard/pedagogie/structure/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle Classe
                </Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" onValueChange={setActiveCycleFilter}>
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              {isLoading ? 
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24" />) :
                cycles.sort((a, b) => a.order - b.order).map(cycle => (
                  <TabsTrigger 
                    key={cycle.id} 
                    value={cycle.id}
                  >
                    {cycle.name}
                  </TabsTrigger>
                ))
              }
            </TabsList>
            
            <TabsContent value={activeCycleFilter} className="mt-6">
                 {viewMode === 'grid' ? (
                    <ClassesGridView cycleId={activeCycleFilter} />
                  ) : (
                    <ClassesListView cycleId={activeCycleFilter} />
                 )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
