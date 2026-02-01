'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfileForm } from '@/components/profil/user-profile-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function ProfilePageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function ProfilePage() {
    const { user, loading: userLoading } = useUser();
    
    if (userLoading || !user) {
        return <ProfilePageSkeleton />;
    }
    
    if (user.isParent) {
        // Parents don't have a staff profile to edit in this manner.
        // We can show a simple info card.
        return (
            <div>
                 <h1 className="text-2xl font-bold">Mon Profil</h1>
                 <p className="text-muted-foreground">Informations de votre compte parent.</p>
                 <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>{user.displayName}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                 </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Mon Profil</h1>
                <p className="text-muted-foreground">Gérez les informations de votre profil personnel et professionnel.</p>
            </div>
            
            <UserProfileForm />
            
        </div>
    );
}
