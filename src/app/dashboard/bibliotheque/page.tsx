
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
import { PlusCircle, MoreHorizontal, User, Hash, ArrowRight } from "lucide-react";
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
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp, query } from "firebase/firestore";
import { useSchoolData } from "@/hooks/use-school-data";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookList } from '@/components/bibliotheque/book-list';
import { LoanList } from '@/components/bibliotheque/loan-list';
import { BookOpen, Handshake } from 'lucide-react';

export default function LibraryPage() {
  const { schoolId, loading } = useSchoolData();

  if (loading || !schoolId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-lg font-semibold md:text-2xl">Bibliothèque</h1>
            <p className="text-muted-foreground">Consultez et gérez les livres et les prêts de votre établissement.</p>
        </div>
      <Tabs defaultValue="livres" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="livres">
                <BookOpen className="mr-2 h-4 w-4" />
                Liste des Livres
            </TabsTrigger>
            <TabsTrigger value="prets">
                <Handshake className="mr-2 h-4 w-4" />
                Suivi des Prêts
            </TabsTrigger>
        </TabsList>
        <TabsContent value="livres" className="mt-6">
            <BookList schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="prets" className="mt-6">
            <LoanList schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
