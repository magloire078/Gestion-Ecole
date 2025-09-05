
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { mockLibraryData } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useState } from "react";
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
import type { Book } from "@/lib/data";

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>(mockLibraryData);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const { toast } = useToast();

  const resetForm = () => {
    setNewTitle("");
    setNewAuthor("");
    setNewQuantity("");
  };

  const handleAddBook = () => {
    if (!newTitle || !newAuthor || !newQuantity) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    const newBook: Book = {
      id: `L${books.length + 1}`,
      title: newTitle,
      author: newAuthor,
      quantity: parseInt(newQuantity, 10),
    };

    setBooks([...books, newBook]);
    toast({
      title: "Livre ajouté",
      description: `"${newTitle}" a été ajouté à la bibliothèque.`,
    });

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleOpenEditDialog = (book: Book) => {
    setEditingBook(book);
    setNewTitle(book.title);
    setNewAuthor(book.author);
    setNewQuantity(String(book.quantity));
    setIsEditDialogOpen(true);
  };

  const handleEditBook = () => {
    if (!editingBook || !newTitle || !newAuthor || !newQuantity) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Tous les champs sont requis.",
      });
      return;
    }

    setBooks(
      books.map((b) =>
        b.id === editingBook.id
          ? {
              ...b,
              title: newTitle,
              author: newAuthor,
              quantity: parseInt(newQuantity, 10),
            }
          : b
      )
    );

    toast({
      title: "Livre modifié",
      description: `Les informations pour "${newTitle}" ont été mises à jour.`,
    });

    setIsEditDialogOpen(false);
    setEditingBook(null);
    resetForm();
  };

  const handleOpenDeleteDialog = (book: Book) => {
    setBookToDelete(book);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteBook = () => {
    if (!bookToDelete) return;

    setBooks(books.filter((b) => b.id !== bookToDelete.id));

    toast({
      title: "Livre supprimé",
      description: `"${bookToDelete.title}" a été retiré de la bibliothèque.`,
    });

    setIsDeleteDialogOpen(false);
    setBookToDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold md:text-2xl">Inventaire de la Bibliothèque</h1>
            <p className="text-muted-foreground">Consultez et gérez les livres disponibles dans la bibliothèque de l'école.</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              if(!isOpen) resetForm();
              setIsAddDialogOpen(isOpen)
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un livre
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau livre</DialogTitle>
                <DialogDescription>
                  Renseignez les informations du nouveau livre.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Titre
                  </Label>
                  <Input id="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="col-span-3" placeholder="Ex: Les Misérables" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="author" className="text-right">
                    Auteur
                  </Label>
                  <Input id="author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} className="col-span-3" placeholder="Ex: Victor Hugo" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">
                    Quantité
                  </Label>
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell className="text-right">{book.quantity}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(book)}>Modifier</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleOpenDeleteDialog(book)}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
          if(!isOpen) setEditingBook(null);
          setIsEditDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le livre</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du livre <strong>"{editingBook?.title}"</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Titre
              </Label>
              <Input id="edit-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-author" className="text-right">
                Auteur
              </Label>
              <Input id="edit-author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-quantity" className="text-right">
                Quantité
              </Label>
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
            <AlertDialogDescription>
              Cette action est irréversible. Le livre <strong>"{bookToDelete?.title}"</strong> sera définitivement supprimé.
            </AlertDialogDescription>
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
