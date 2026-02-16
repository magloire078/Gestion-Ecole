'use client';

import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { UserProfileForm } from '@/components/profil/user-profile-form';
import { ImageUploader } from '@/components/image-uploader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    const { user, loading: userLoading, reloadUser } = useUser();
    const firestore = useFirestore();

    if (userLoading || !user) {
        return <ProfilePageSkeleton />;
    }

    if (user.isParent) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Mon Profil</h1>
                    <p className="text-muted-foreground">Informations de votre compte parent.</p>
                </div>
                <Card className="mt-6 overflow-hidden">
                    <CardHeader className="flex flex-row items-center gap-6 space-y-0">
                        <ImageUploader
                            onUploadComplete={async (url) => {
                                // Mettre à jour Firestore pour le parent
                                if (user.schoolId) {
                                    const parentRef = doc(firestore, `ecoles/${user.schoolId}/parents/${user.uid}`);
                                    await updateDoc(parentRef, { photoURL: url });
                                    reloadUser();
                                }
                            }}
                            storagePath={`ecoles/${user.schoolId || 'global'}/parents/${user.uid}/avatars`}
                            currentImageUrl={user.photoURL}
                            resizeWidth={400}
                        >
                            <Avatar className="h-20 w-20 border-2 border-primary/10 cursor-pointer hover:opacity-80 transition-opacity">
                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Profil'} />
                                <AvatarFallback className="text-xl bg-primary/5 text-primary">
                                    {(user.displayName || '?').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </ImageUploader>
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-xl truncate">{user.displayName}</CardTitle>
                            <CardDescription className="truncate">{user.email}</CardDescription>
                            <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full w-fit">
                                Compte Parent
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="border-t pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Type de compte</p>
                                <p className="font-bold text-[#0C365A]">Parent d'élève</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Identifiant Unique</p>
                                <p className="font-mono text-xs text-slate-500 truncate">{user.uid}</p>
                            </div>
                        </div>
                    </CardContent>
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
