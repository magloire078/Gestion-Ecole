'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collectionGroup, query, getDocs, limit, startAt, endAt, orderBy } from 'firebase/firestore';
import type { staff } from '@/lib/data-types';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { grantSuperAdmin } from '@/services/admin-services';

interface GrantAdminDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAdminGranted: () => void;
}

export function GrantAdminDialog({ isOpen, onOpenChange, onAdminGranted }: GrantAdminDialogProps) {
    const firestore = useFirestore();
    const { user: grantingAdmin } = useUser();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<(staff & {id: string})[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<(staff & {id: string}) | null>(null);
    const [isGranting, setIsGranting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedUser(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const search = async () => {
            if (searchQuery.length < 3) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const staffCollection = collectionGroup(firestore, 'personnel');
                // Note: Firestore string queries are case-sensitive. This will only find matches starting with the query.
                // A more robust search would require a third-party service like Algolia.
                const q = query(
                    staffCollection, 
                    orderBy('displayName'), 
                    startAt(searchQuery), 
                    endAt(searchQuery + '\uf8ff'),
                    limit(10)
                );
                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as staff & {id: string}));
                setSearchResults(results);
            } catch (e) {
                console.error("Failed to search users:", e);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(search, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, firestore]);

    const handleGrant = async () => {
        if (!selectedUser || !grantingAdmin?.uid) return;
        setIsGranting(true);
        try {
            await grantSuperAdmin(firestore, selectedUser.uid, grantingAdmin.uid);
            toast({ title: 'Privilèges accordés', description: `${selectedUser.displayName} est maintenant super administrateur.` });
            onAdminGranted();
            onOpenChange(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: e.message });
        } finally {
            setIsGranting(false);
        }
    };
    
    if (selectedUser) {
        return (
             <AlertDialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer l'octroi des droits</AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir donner les privilèges de super administrateur à <strong>{selectedUser.displayName}</strong> ({selectedUser.email}) ?
                            Cette personne aura un accès complet à toutes les données et fonctionnalités de la plateforme.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSelectedUser(null)}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGrant} disabled={isGranting}>
                            {isGranting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirmer et accorder
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="p-0">
                 <Command>
                    <CommandInput 
                        placeholder="Rechercher un membre du personnel par nom..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {isSearching && <CommandItem disabled>Recherche...</CommandItem>}
                        <CommandEmpty>{!isSearching && searchQuery.length >= 3 ? 'Aucun utilisateur trouvé.' : 'Entrez au moins 3 caractères pour rechercher.'}</CommandEmpty>
                        <CommandGroup>
                            {searchResults.map(user => (
                                <CommandItem key={user.id} onSelect={() => setSelectedUser(user)}>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.photoURL || ''} />
                                            <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p>{user.displayName}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    )
}
