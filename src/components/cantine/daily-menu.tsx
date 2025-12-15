
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { canteenMenu as CanteenMenu } from '@/lib/data-types';
import { Skeleton } from '@/components/ui/skeleton';

export function DailyMenu({ schoolId, date }: { schoolId: string, date?: Date }) {
  const firestore = useFirestore();
  const [selectedDate, setSelectedDate] = useState(date || new Date());
  const [menu, setMenu] = useState<CanteenMenu | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadMenuForDate(selectedDate);
  }, [selectedDate, schoolId]);
  
  const loadMenuForDate = async (date: Date) => {
    setLoading(true);
    setMenu(null);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Pour l'exemple, nous allons utiliser un ID de menu fixe. Dans une vraie app, on ferait une query.
    const menuId = `menu_${dateStr}_dejeuner`; 
    const menuRef = doc(firestore, `ecoles/${schoolId}/cantine/menus/${menuId}`);
    
    try {
        const menuDoc = await getDoc(menuRef);
        if (menuDoc.exists()) {
          setMenu(menuDoc.data() as CanteenMenu);
        } else {
            // Créer un menu par défaut pour la démo si aucun n'existe
            createDemoMenu(dateStr);
        }
    } catch(e) {
        console.error("Error loading menu:", e);
    } finally {
        setLoading(false);
    }
  };
  
  const createDemoMenu = async (dateStr: string) => {
    const demoMenu: CanteenMenu = {
        date: dateStr,
        mealType: "dejeuner",
        status: "published",
        categories: [
            { name: "Entrées", items: [{ name: "Salade César", description: "Salade, poulet, croûtons, parmesan", allergens: ["lactose", "gluten"], priceStudent: 1500, priceStaff: 2000 }] },
            { name: "Plats principaux", items: [{ name: "Thiéboudienne", description: "Plat national sénégalais à base de riz et de poisson.", allergens: [], priceStudent: 2500, priceStaff: 3500, options: ["portion normale"] }] },
            { name: "Desserts", items: [{ name: "Salade de fruits frais", description: "Ananas, mangue, pastèque", allergens: [], priceStudent: 1000, priceStaff: 1500 }] }
        ],
        specialMenus: {
            vegetarian: { available: true, mainCourse: "Curry de légumes" },
            halal: { available: true, mainCourse: "Le plat principal est Halal" }
        }
    };
    setMenu(demoMenu); // Afficher immédiatement le menu démo
  }
  
  return (
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
                <CardTitle>Menu du {format(selectedDate, 'EEEE d MMMM', { locale: fr })}</CardTitle>
                <CardDescription>Découvrez le menu du déjeuner de votre école.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {menu.categories.map((category) => (
                    <div key={category.name} className="space-y-3">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {category.items?.map((item) => (
                          <div key={item.name} className="border rounded-lg p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium">{item.name}</h4>
                                    <div className="text-right shrink-0 ml-2">
                                        <div className="font-bold">{item.priceStudent?.toLocaleString('fr-FR')} CFA</div>
                                        <div className="text-xs text-muted-foreground">élève</div>
                                    </div>
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
             <Card className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                    <p>Aucun menu publié pour cette date.</p>
                    <p className="text-xs mt-2">(Un menu de démo est affiché s'il n'y a pas de données réelles)</p>
                </div>
             </Card>
        )}
      </div>
    </div>
  );
}

    