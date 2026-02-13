
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
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, User, Hash, Handshake, Trash2, Edit } from "lucide-react";
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
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoanList } from '@/components/bibliotheque/loan-list';
import { BookOpen } from 'lucide-react';
import type { libraryBook as LibraryBook, student as Student } from "@/lib/data-types";
import { LoanDialog } from "./loan-dialog";
import { ImageUploader } from "../image-uploader";
import { LibraryService } from "@/services/library-service";
import { useLibraryBooks } from "@/hooks/use-library-books";

const bookSchema = z.object({
  title: z.string().min(1, { message: "Le titre est requis." }),
  author: z.string().min(1, { message: "L'auteur est requis." }),
  quantity: z.coerce.number().int().min(0, { message: "La quantité doit être un nombre positif." }),
  frontCoverUrl: z.string().url().optional().or(z.literal('')),
  backCoverUrl: z.string().url().optional().or(z.literal('')),
});

type BookFormValues = z.infer<typeof bookSchema>;

interface BookListProps {
  schoolId: string;
}

export function BookList({ schoolId }: BookListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const canManageLibrary = !!user?.profile?.permissions?.manageLibrary;

  // Use new hooks for data fetching
  const { books, loading: booksLoading } = useLibraryBooks(schoolId);

  const studentsQuery = useMemo(() => query(collection(firestore, `ecoles/${schoolId}/eleves`)), [firestore, schoolId]);
  const { data: studentsData, loading: studentsLoading } = useCollection(studentsQuery);
  const students: (Student & { id: string })[] = useMemo(() => studentsData?.map(d => ({ id: d.id, ...d.data() } as Student & { id: string })) || [], [studentsData]);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);

  const [selectedBookForLoan, setSelectedBookForLoan] = useState<(LibraryBook & { id: string }) | null>(null);
  const [editingBook, setEditingBook] = useState<(LibraryBook & { id: string }) | null>(null);
  const [bookToDelete, setBookToDelete] = useState<(LibraryBook & { id: string }) | null>(null);

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: { title: "", author: "", quantity: 1, frontCoverUrl: "", backCoverUrl: "" },
  });
  const { reset } = form;

  useEffect(() => {
    reset(editingBook || { title: "", author: "", quantity: 1, frontCoverUrl: "", backCoverUrl: "" });
  }, [isFormOpen, editingBook, reset]);

  const handleBookSubmit = async (values: BookFormValues) => {
    if (!schoolId) return;

    const bookData = {
      title: values.title,
      author: values.author,
      quantity: values.quantity,
      frontCoverUrl: values.frontCoverUrl || '',
      backCoverUrl: values.backCoverUrl || '',
    };

    try {
      if (editingBook) {
        await LibraryService.updateBook(schoolId, editingBook.id, bookData);
      } else {
        await LibraryService.createBook(schoolId, bookData);
      }
      toast({ title: `Livre ${editingBook ? "modifié" : "ajouté"}`, description: `"${values.title}" a été ${editingBook ? "modifié" : "ajouté"} à la bibliothèque.` });
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving book:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer le livre." });
    }
  };

  const handleOpenFormDialog = (book: (LibraryBook & { id: string }) | null) => {
    setEditingBook(book);
    setIsFormOpen(true);
  };

  const handleOpenLoanDialog = (book: LibraryBook & { id: string }) => {
    setSelectedBookForLoan(book);
    setIsLoanDialogOpen(true);
  };

  const handleOpenDeleteDialog = (book: LibraryBook & { id: string }) => {
    setBookToDelete(book);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBook = async () => {
    if (!schoolId || !bookToDelete) return;

    try {
      await LibraryService.deleteBook(schoolId, bookToDelete.id);
      toast({ title: "Livre supprimé" });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting book:", error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de supprimer le livre." });
    }
  };

  const isLoading = booksLoading || studentsLoading;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Catalogue ({books.length} titres)</h2>
        {canManageLibrary && (
          <Button onClick={() => handleOpenFormDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un Livre
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
        ) : books.map((book) => (
          <Card key={book.id} className="flex flex-col">
            <CardHeader className="p-0">
              <div className="relative h-40 w-full">
                <SafeImage
                  src={book.frontCoverUrl || `https://picsum.photos/seed/${book.id}/400/200`}
                  alt={`Couverture du livre ${book.title}`}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="rounded-t-lg"
                  data-ai-hint="book cover"
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-tight font-bold">{book.title}</CardTitle>
                  {canManageLibrary && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0 h-8 w-8")}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenLoanDialog(book)}><Handshake className="mr-2 h-4 w-4" />Enregistrer un prêt</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenFormDialog(book)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleOpenDeleteDialog(book)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
      {!isLoading && books.length === 0 && (
        <Card className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Aucun livre dans la bibliothèque pour le moment.</p>
        </Card>
      )}

      {/* --- Dialogs --- */}
      {canManageLibrary && (
        <>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingBook ? "Modifier le" : "Ajouter un Nouveau"} Livre</DialogTitle>
                <DialogDescription>{editingBook ? `Mettez à jour les informations du livre "${editingBook.title}".` : "Renseignez les informations du nouveau livre."}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form id="book-form" onSubmit={form.handleSubmit(handleBookSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                  <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Titre</FormLabel><FormControl><Input placeholder="Ex: Les Misérables" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="author" render={({ field }) => (<FormItem><FormLabel>Auteur</FormLabel><FormControl><Input placeholder="Ex: Victor Hugo" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantité</FormLabel><FormControl><Input type="number" placeholder="Ex: 5" {...field} /></FormControl><FormMessage /></FormItem>)} />

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="frontCoverUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couverture Avant</FormLabel>
                          <FormControl>
                            <ImageUploader
                              onUploadComplete={(url) => field.onChange(url)}
                              storagePath={`ecoles/${schoolId}/library_covers/`}
                              currentImageUrl={field.value}
                              resizeWidth={600}
                            >
                              <div className="w-full h-40 border-dashed border-2 rounded-md flex items-center justify-center bg-muted hover:bg-muted/80 cursor-pointer">
                                {field.value ? (
                                  <SafeImage src={field.value} alt="Couverture avant" width={100} height={150} className="object-contain h-full" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">Téléverser</span>
                                )}
                              </div>
                            </ImageUploader>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="backCoverUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couverture Arrière</FormLabel>
                          <FormControl>
                            <ImageUploader
                              onUploadComplete={(url) => field.onChange(url)}
                              storagePath={`ecoles/${schoolId}/library_covers/`}
                              currentImageUrl={field.value}
                              resizeWidth={600}
                            >
                              <div className="w-full h-40 border-dashed border-2 rounded-md flex items-center justify-center bg-muted hover:bg-muted/80 cursor-pointer">
                                {field.value ? (
                                  <SafeImage src={field.value} alt="Couverture arrière" width={100} height={150} className="object-contain h-full" />
                                ) : (
                                  <span className="text-xs text-muted-foreground">Téléverser</span>
                                )}
                              </div>
                            </ImageUploader>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Annuler</Button>
                <Button type="submit" form="book-form" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible. Le livre <strong>"{bookToDelete?.title}"</strong> sera définitivement supprimé.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBook} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <LoanDialog
            isOpen={isLoanDialogOpen}
            onClose={() => setIsLoanDialogOpen(false)}
            book={selectedBookForLoan}
            students={students}
            schoolId={schoolId}
          />
        </>
      )}
    </>
  );
}
