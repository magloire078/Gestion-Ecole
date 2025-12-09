

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
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const bookSchema = z.object({
  title: z.string().min(1, { message: "Le titre est requis." }),
  author: z.string().min(1, { message: "L'auteur est requis." }),
  quantity: z.coerce.number().int().min(0, { message: "La quantité doit être un nombre positif." }),
});

type BookFormValues = z.infer<typeof bookSchema>;


interface LibraryBook {
    id: string;
    title: string;
    author: string;
    quantity: number;
}

export default function LibraryPage() {
  const firestore = useFirestore();
  const { schoolId, loading: schoolLoading } = useSchoolData();
  const { toast } = useToast();
  
  const booksQuery = useMemoFirebase(() => schoolId ? collection(firestore, `ecoles/${schoolId}/bibliotheque`) : null, [firestore, schoolId]);
  const { data: booksData, loading: booksLoading } = useCollection(booksQuery);
  const books: LibraryBook[] = useMemo(() => booksData?.map(d => ({ id: d.id, ...d.data() } as LibraryBook)) || [], [booksData]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [bookToDelete, setBookToDelete] = useState<LibraryBook | null>(null);

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: "",
      author: "",
      quantity: 0,
    },
  });

  useEffect(() => {
    if (isFormOpen) {
      if (editingBook) {
        form.reset({
          title: editingBook.title,
          author: editingBook.author,
          quantity: editingBook.quantity,
        });
      } else {
        form.reset({
          title: "",
          author: "",
          quantity: 0,
        });
      }
    }
  }, [isFormOpen, editingBook, form]);


  const getBookDocRef = (bookId: string) => doc(firestore, `ecoles/${schoolId}/bibliotheque/${bookId}`);

  const handleBookSubmit = (values: BookFormValues) => {
    if (!schoolId) {
      toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
      return;
    }
    
    const bookData = {
      ...values,
      createdAt: serverTimestamp(),
    };

    if (editingBook) {
        const bookDocRef = getBookDocRef(editingBook.id);
        setDoc(bookDocRef, bookData, { merge: true })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: bookDocRef.path, operation: 'update', requestResourceData: bookData });
            errorEmitter.emit('permission-error', permissionError);
        });
        toast({ title: "Livre modifié", description: `Les informations pour "${values.title}" ont été mises à jour.` });
        setIsFormOpen(false);

    } else {
        const booksCollectionRef = collection(firestore, `ecoles/${schoolId}/bibliotheque`);
        addDoc(booksCollectionRef, bookData)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({ path: booksCollectionRef.path, operation: 'create', requestResourceData: bookData });
            errorEmitter.emit('permission-error', permissionError);
        });
        toast({ title: "Livre ajouté", description: `"${values.title}" a été ajouté à la bibliothèque.` });
        setIsFormOpen(false);
    }
  };


  const handleOpenFormDialog = (book: LibraryBook | null) => {
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const handleOpenDeleteDialog = (book: LibraryBook) => {
    setBookToDelete(book);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBook = () => {
    if (!schoolId || !bookToDelete) return;
    const bookDocRef = getBookDocRef(bookToDelete.id);
    deleteDoc(bookDocRef)
    .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({ path: bookDocRef.path, operation: 'delete' });
        errorEmitter.emit('permission-error', permissionError);
    });
    toast({ title: "Livre supprimé", description: `"${bookToDelete.title}" a été retiré de la bibliothèque.` });
    setIsDeleteDialogOpen(false);
    setBookToDelete(null);
  };
  
  const isLoading = schoolLoading || booksLoading;

  const renderForm = () => (
    <Form {...form}>
      <form id="book-form" onSubmit={form.handleSubmit(handleBookSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
              <FormLabel className="text-right">Titre</FormLabel>
              <FormControl className="col-span-3">
                <Input placeholder="Ex: Les Misérables" {...field} />
              </FormControl>
              <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
              <FormLabel className="text-right">Auteur</FormLabel>
              <FormControl className="col-span-3">
                <Input placeholder="Ex: Victor Hugo" {...field} />
              </FormControl>
              <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem className="grid grid-cols-4 items-center gap-4">
              <FormLabel className="text-right">Quantité</FormLabel>
              <FormControl className="col-span-3">
                <Input type="number" placeholder="Ex: 5" {...field} />
              </FormControl>
              <FormMessage className="col-start-2 col-span-3" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Bibliothèque</h1>
            <p className="text-muted-foreground">Consultez et gérez les livres disponibles dans la bibliothèque de l'école.</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenFormDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Livre</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingBook ? "Modifier le" : "Ajouter un Nouveau"} Livre</DialogTitle>
                <DialogDescription>
                  {editingBook ? `Mettez à jour les informations du livre "${editingBook.title}".` : "Renseignez les informations du nouveau livre."}
                </DialogDescription>
              </DialogHeader>
              {renderForm()}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" form="book-form" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
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
                        fill
                        style={{objectFit: 'cover'}}
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
                              <DropdownMenuItem onClick={() => handleOpenFormDialog(book)}>Modifier</DropdownMenuItem>
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

    
