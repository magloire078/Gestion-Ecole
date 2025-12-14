
'use client';

import { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';

interface UseStorageUploaderProps {
    onSuccess: (url: string) => void;
    onError: (error: string) => void;
    maxSizeMB?: number;
}

export function useStorageUploader({ onSuccess, onError, maxSizeMB = 5 }: UseStorageUploaderProps) {
    const firebaseApp = useFirebaseApp();
    const storage = getStorage(firebaseApp);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const uploadFile = (file: File, path: string) => {
        // --- Validation ---
        if (file.size > maxSizeMB * 1024 * 1024) {
            const errorMsg = `L'image ne doit pas dépasser ${maxSizeMB}MB.`;
            setError(errorMsg);
            onError(errorMsg);
            return;
        }

        if (!file.type.startsWith('image/')) {
            const errorMsg = 'Le fichier doit être une image.';
            setError(errorMsg);
            onError(errorMsg);
            return;
        }
        
        // --- Reset State & Start Upload ---
        setIsUploading(true);
        setError(null);
        setProgress(0);

        const timestamp = Date.now();
        const filename = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `${path}${filename}`);

        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(currentProgress);
            },
            (uploadError) => {
                console.error("Upload error:", uploadError);
                const errorMsg = "Échec du téléversement. Vérifiez les règles de sécurité de Firebase Storage.";
                setError(errorMsg);
                onError(errorMsg);
                setIsUploading(false);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    onSuccess(downloadURL);
                    setIsUploading(false);
                }).catch(urlError => {
                     console.error("Get URL error:", urlError);
                     const errorMsg = "Impossible de récupérer l'URL de l'image après le téléversement.";
                     setError(errorMsg);
                     onError(errorMsg);
                     setIsUploading(false);
                });
            }
        );
    };

    return {
        uploadFile,
        isUploading,
        progress,
        error
    };
}
