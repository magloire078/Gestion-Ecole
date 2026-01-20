'use client';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ParentAccessRedirectPage() {
    const { toast } = useToast();
    useEffect(() => {
        toast({
            title: "Portail Parent mis à jour",
            description: "Veuillez maintenant vous connecter avec votre compte pour accéder à l'espace de votre enfant.",
            duration: 8000,
        });
        redirect('/auth/login');
    }, [toast]);
    return null;
}
