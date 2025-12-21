
'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import { ClassesGridView } from '@/components/classes/classes-grid-view';
import { ClassesListView } from '@/components/classes/classes-list-view';
import { useUser } from '@/firebase';
import Link from 'next/link';

export function ClassesList() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useUser();
  const isDirectorOrAdmin = user?.profile?.role === 'directeur' || user?.profile?.isAdmin === true;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Toutes les Classes</CardTitle>
            <CardDescription>Vue d'ensemble de toutes les classes de l'établissement.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
            {isDirectorOrAdmin && (
              <Button asChild>
                <Link href="/dashboard/pedagogie/structure/new">
                  <Plus className="mr-2 h-4 w-4" />Nouvelle Classe
                </Link>
              </Button>
            )}
          </div>
        </div>
        <div className="relative flex-1 mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une classe..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'grid' ? (
          <ClassesGridView cycleId="all" searchQuery={searchQuery} />
        ) : (
          <ClassesListView cycleId="all" searchQuery={searchQuery} />
        )}
      </CardContent>
    </Card>
  );
}
