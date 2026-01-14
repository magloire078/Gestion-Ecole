
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
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

    const recentStudentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`), orderBy('createdAt', 'desc'), limit(3)) : null, [firestore, schoolId]);
    const recentMessagesQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/messagerie`), where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'), limit(3)) : null, [firestore, schoolId]);
    const recentBooksQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/bibliotheque`), orderBy('createdAt', 'desc'), limit(3)) : null, [firestore, schoolId]);

    const { data: studentsData, loading: studentsLoading } = useCollection(recentStudentsQuery);
    const { data: messagesData, loading: messagesLoading } = useCollection(recentMessagesQuery);
    const { data: booksData, loading: booksLoading } = useCollection(recentBooksQuery);
    
    const loading = studentsLoading || messagesLoading || booksLoading;

    const recentItems = [
        ...(studentsData?.map(doc => ({ type: 'student', ...doc.data() } as student & { type: 'student' })) || []),
        ...(messagesData?.map(doc => ({ type: 'message', ...doc.data() } as message & { type: 'message' })) || []),
        ...(booksData?.map(doc => ({ type: 'book', ...doc.data() } as libraryBook & { type: 'book' })) || []),
    ].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (!schoolId) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Activité Récente</CardTitle>
                    <CardDescription>Derniers ajouts dans votre établissement.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                             <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                         ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
                <CardDescription>Derniers ajouts dans votre établissement.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {loading ? (
                         [...Array(3)].map((_, i) => (
                             <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                         ))
                    ) : recentItems.length > 0 ? recentItems.slice(0, 5).map((item: any, index) => (
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
                                    {item.createdAt?.seconds ? formatDistanceToNow(new Date(item.createdAt.seconds * 1000), { addSuffix: true, locale: fr }) : 'il y a quelques instants'}
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
