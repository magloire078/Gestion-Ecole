'use client';
import {useEffect} from 'react';
import {errorEmitter} from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';
import {useToast} from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();
  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // In a real app, you might want to log this to a service like Sentry
      // For this example, we'll throw it to make it visible in the Next.js overlay
      console.error("Caught Firestore Permission Error:", error.message);
      toast({
          variant: "destructive",
          title: "Erreur de Permissions",
          description: "Votre action a été bloquée par les règles de sécurité. Assurez-vous d'avoir les droits nécessaires.",
          duration: 9000
      });

      // We re-throw the error so Next.js can display its overlay in development
      if (process.env.NODE_ENV === 'development') {
          throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
