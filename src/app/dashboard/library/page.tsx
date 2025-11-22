
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, User, Hash } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthProtection } from '@/hooks/use-auth-protection.tsx';

interface LibraryBook {
    id: string;
    title: string;
    author: string;
    quantity: number;
}

export default function LibraryPage() {
  const { isLoading: isAuthLoading, AuthProtectionLoader } = useAuthProtection();
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  
  const booksQuery = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/library`) : null, [firestore, schoolId]);
  const { data: booksData, loading: booksLoading } = useCollection(booksQuery);
  const books: LibraryBook[] = useMemo(() => booksData?.map(d => ({ id: d.id, ...d.data() } as LibraryBook)) || [], [booksData]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [bookToDelete, setBookToDelete] = useState<LibraryBook | null>(null);

  const { toast } = useToast();

  const getBookDocRef = (bookId: string) => doc(firestore, `schools/${schoolId}/library/${bookId}`);

  const resetForm = () => {
    setNewTitle("");
    setNewAuthor("");
    setNewQuantity("");
  };

  const handleAddBook = () => {
    if (!schoolId || !newTitle || !newAuthor || !newQuantity) {
      toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }
    const newBookData = {
      title: newTitle,
      author: newAuthor,
      quantity: parseInt(newQuantity, 10),
    };
    const booksCollectionRef = collection(firestore, `schools/${schoolId}/library`);
    addDoc(booksCollectionRef, newBookData)
    .then(() => {
        toast({ title: "Livre ajouté", description: `"${newTitle}" a été ajouté à la bibliothèque.` });
        resetForm();
        setIsAddDialogOpen(false);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: booksCollectionRef.path, operation: 'create', requestResourceData: newBookData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleOpenEditDialog = (book: LibraryBook) => {
    setEditingBook(book);
    setNewTitle(book.title);
    setNewAuthor(book.author);
    setNewQuantity(String(book.quantity));
    setIsEditDialogOpen(true);
  };

  const handleEditBook = () => {
    if (!schoolId || !editingBook || !newTitle || !newAuthor || !newQuantity) {
      toast({ variant: "destructive", title: "Erreur", description: "Tous les champs sont requis." });
      return;
    }
    const updatedData = {
      title: newTitle,
      author: newAuthor,
      quantity: parseInt(newQuantity, 10),
    };
    const bookDocRef = getBookDocRef(editingBook.id);
    setDoc(bookDocRef, updatedData, { merge: true })
    .then(() => {
        toast({ title: "Livre modifié", description: `Les informations pour "${newTitle}" ont été mises à jour.` });
        setIsEditDialogOpen(false);
        setEditingBook(null);
        resetForm();
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: bookDocRef.path, operation: 'update', requestResourceData: updatedData });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleOpenDeleteDialog = (book: LibraryBook) => {
    setBookToDelete(book);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBook = () => {
    if (!schoolId || !bookToDelete) return;
    const bookDocRef = getBookDocRef(bookToDelete.id);
    deleteDoc(bookDocRef)
    .then(() => {
        toast({ title: "Livre supprimé", description: `"${bookToDelete.title}" a été retiré de la bibliothèque.` });
        setIsDeleteDialogOpen(false);
        setBookToDelete(null);
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: bookDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  const isLoading = schoolLoading || booksLoading;

  if (isAuthLoading) {
    return <AuthProtectionLoader />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Bibliothèque</h1>
            <p className="text-muted-foreground">Consultez et gérez les livres disponibles dans la bibliothèque de l'école.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              if(!isOpen) resetForm();
              setIsAddDialogOpen(isOpen)
          }}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Livre</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter un Nouveau Livre</DialogTitle>
                <DialogDescription>Renseignez les informations du nouveau livre.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Titre</Label>
                  <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="col-span-3" placeholder="Ex: Les Misérables" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="author" className="text-right">Auteur</Label>
                  <Input id="author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} className="col-span-3" placeholder="Ex: Victor Hugo" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">Quantité</Label>
                  <Input id="quantity" type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="col-span-3" placeholder="Ex: 5" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddBook}>Ajouter le livre</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
            ) : books.map((book) => (
             <Card key={book.id} className="flex flex-col">
              <CardHeader className="p-0">
                  <div className="relative h-40 w-full">
                     <Image 
                        src={`https://picsum.photos/seed/${book.id}/400/200`} 
                        alt={`Couverture du livre ${book.title}`} 
                        layout="fill"
                        objectFit="cover"
                        className="rounded-t-lg"
                        data-ai-hint="book cover"
                     />
                  </div>
                 <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                         <CardTitle className="text-lg leading-tight font-bold">{book.title}</CardTitle>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(book)}>Modifier</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(book)}>Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                    </div>
                     <CardDescription className="flex items-center gap-2 text-sm mt-1">
                        <User className="h-4 w-4" />
                        {book.author}
                    </CardDescription>
                 </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4 px-4 pt-0">
                  <div className="flex items-center text-sm text-muted-foreground">
                      <Hash className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Quantité disponible: <strong>{book.quantity}</strong></span>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
        { !isLoading && books.length === 0 && (
             <Card className="flex items-center justify-center h-48">
                <p className="text-muted-foreground">Aucun livre dans la bibliothèque pour le moment.</p>
            </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingBook(null); setIsEditDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le Livre</DialogTitle>
            <DialogDescription>Mettez à jour les informations du livre <strong>"{editingBook?.title}"</strong>.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">Titre</Label>
              <Input id="edit-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-author" className="text-right">Auteur</Label>
              <Input id="edit-author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-quantity" className="text-right">Quantité</Label>
              <Input id="edit-quantity" type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditBook}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Le livre <strong>"{bookToDelete?.title}"</strong> sera définitivement supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
