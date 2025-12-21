
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { MessageSquare, User, BookOpen } from 'lucide-react';
import type { student, message, libraryBook } from '@/lib/data-types';

interface RecentActivityProps {
    schoolId: string;
}

export function RecentActivity({ schoolId }: RecentActivityProps) {
    const firestore = useFirestore();

    const recentStudentsQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/eleves`), orderBy('createdAt', 'desc'), limit(3)), [firestore, schoolId]);
    const recentMessagesQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/messagerie`), orderBy('createdAt', 'desc'), limit(3)), [firestore, schoolId]);
    const recentBooksQuery = useMemoFirebase(() => query(collection(firestore, `ecoles/${schoolId}/bibliotheque`), orderBy('createdAt', 'desc'), limit(3)), [firestore, schoolId]);

    const { data: studentsData, loading: studentsLoading } = useCollection(recentStudentsQuery);
    const { data: messagesData, loading: messagesLoading } = useCollection(recentMessagesQuery);
    const { data: booksData, loading: booksLoading } = useCollection(recentBooksQuery);
    
    const loading = studentsLoading || messagesLoading || booksLoading;

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    const recentItems = [
        ...(studentsData?.map(doc => ({ type: 'student', ...doc.data() } as student & { type: 'student' })) || []),
        ...(messagesData?.map(doc => ({ type: 'message', ...doc.data() } as message & { type: 'message' })) || []),
        ...(booksData?.map(doc => ({ type: 'book', ...doc.data() } as libraryBook & { type: 'book' })) || []),
    ].sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
                <CardDescription>Derniers ajouts dans votre établissement.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentItems.length > 0 ? recentItems.slice(0, 5).map((item: any, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <div className="p-2 bg-muted rounded-full">
                                {item.type === 'student' && <User className="h-5 w-5 text-muted-foreground" />}
                                {item.type === 'message' && <MessageSquare className="h-5 w-5 text-muted-foreground" />}
                                {item.type === 'book' && <BookOpen className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">
                                    {item.type === 'student' && `Nouvel élève : ${item.firstName} ${item.lastName}`}
                                    {item.type === 'message' && `Nouveau message : "${item.title}"`}
                                    {item.type === 'book' && `Nouveau livre : ${item.title}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(item.createdAt?.seconds * 1000), { addSuffix: true, locale: fr })}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-8">Aucune activité récente à afficher.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
