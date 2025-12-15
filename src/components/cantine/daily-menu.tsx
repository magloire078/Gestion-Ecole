
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { canteenMenu as CanteenMenu } from '@/lib/data-types';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit } from 'lucide-react';
import { MenuForm } from './menu-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export function DailyMenu({ schoolId, date: initialDate }: { schoolId: string, date?: Date }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const canManageContent = !!user?.profile?.permissions?.manageContent;

  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [menu, setMenu] = useState<CanteenMenu | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const loadMenuForDate = async (date: Date) => {
    setLoading(true);
    setMenu(null);
    const dateStr = format(date, 'yyyy-MM-dd');
    const menuRef = doc(firestore, `ecoles/${schoolId}/cantine_menus/${dateStr}_dejeuner`);
    
    try {
        const menuDoc = await getDoc(menuRef);
        if (menuDoc.exists()) {
          setMenu({ id: menuDoc.id, ...menuDoc.data() } as CanteenMenu);
        } else {
          setMenu(null); // No menu for this date
        }
    } catch(e) {
        console.error("Error loading menu:", e);
    } finally {
        setLoading(false);
    }
  };
  
  useEffect(() => {
    loadMenuForDate(selectedDate);
  }, [selectedDate, schoolId]);
  
  const handleMenuSave = () => {
    setIsFormOpen(false);
    loadMenuForDate(selectedDate); // Reload the menu after saving
  };
  
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Choisir une date</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            className="rounded-md border p-0"
            locale={fr}
          />
        </CardContent>
      </Card>
      
      <div className="md:col-span-2">
        {loading ? (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        ) : menu ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Menu du {format(selectedDate, 'EEEE d MMMM', { locale: fr })}</CardTitle>
                        <CardDescription>Découvrez le menu du déjeuner de votre école.</CardDescription>
                    </div>
                    {canManageContent && (
                        <Button variant="outline" size="sm" onClick={() => setIsFormOpen(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Gérer le menu
                        </Button>
                    )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {menu.categories.map((category, index) => (
                    <div key={index} className="space-y-3">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      {category.items && category.items.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {category.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="border rounded-lg p-4 flex flex-col justify-between">
                              <div>
                                  <div className="flex justify-between items-start">
                                      <h4 className="font-medium">{item.name}</h4>
                                      {item.priceStudent != null && (
                                        <div className="text-right shrink-0 ml-2">
                                            <div className="font-bold">{item.priceStudent?.toLocaleString('fr-FR')} CFA</div>
                                            <div className="text-xs text-muted-foreground">élève</div>
                                        </div>
                                      )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                              </div>
                              {item.allergens && item.allergens.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {item.allergens.map((allergen: string) => (
                                    <Badge key={allergen} variant="outline" className="text-xs">
                                      {allergen}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">Aucun plat dans cette catégorie.</p>}
                    </div>
                  ))}
                  
                  {menu.specialMenus && (
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h3 className="font-semibold text-amber-800 dark:text-amber-300">Options spéciales</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {menu.specialMenus.vegetarian?.available && (
                          <div className="text-sm p-3 bg-white dark:bg-card rounded border">
                            <div className="font-medium">Végétarien</div>
                            <div className="text-muted-foreground">
                              {menu.specialMenus.vegetarian.mainCourse}
                            </div>
                          </div>
                        )}
                        {menu.specialMenus.halal?.available && (
                          <div className="text-sm p-3 bg-white dark:bg-card rounded border">
                            <div className="font-medium">Halal</div>
                            <div className="text-muted-foreground">
                              {menu.specialMenus.halal.mainCourse}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        ) : (
             <Card className="flex flex-col items-center justify-center h-96 text-center">
                <CardHeader>
                    <CardTitle>Aucun Menu</CardTitle>
                    <CardDescription>Aucun menu n'a été publié pour le {format(selectedDate, 'd MMMM yyyy', { locale: fr })}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {canManageContent && (
                        <Button onClick={() => setIsFormOpen(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Créer le menu
                        </Button>
                    )}
                </CardContent>
             </Card>
        )}
      </div>
    </div>
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl">
             <DialogHeader>
                <DialogTitle>Gérer le menu du {format(selectedDate, 'EEEE d MMMM', { locale: fr })}</DialogTitle>
                <DialogDescription>
                    Ajoutez, modifiez ou supprimez les plats proposés pour le déjeuner.
                </DialogDescription>
            </DialogHeader>
            <MenuForm 
                schoolId={schoolId}
                menu={menu}
                date={selectedDate}
                onSave={handleMenuSave}
            />
        </DialogContent>
    </Dialog>
    </>
  );
}
