
'use client';

import { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';

interface UseImageUploadProps {
    onSuccess?: (url: string, path: string) => void;
    onError?: (error: string) => void;
    onDeleteSuccess?: () => void;
}

export function useImageUpload({ onSuccess, onError, onDeleteSuccess }: UseImageUploadProps = {}) {
    const firebaseApp = useFirebaseApp();
    const storage = getStorage(firebaseApp);
    
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const upload = (file: File, path: string, maxSizeMB: number = 5) => {
        if (file.size > maxSizeMB * 1024 * 1024) {
            const errorMsg = `L'image ne doit pas dépasser ${maxSizeMB}MB.`;
            setError(errorMsg);
            onError?.(errorMsg);
            return;
        }

        if (!file.type.startsWith('image/')) {
            const errorMsg = 'Le fichier doit être une image.';
            setError(errorMsg);
            onError?.(errorMsg);
            return;
        }
        
        setIsUploading(true);
        setError(null);
        setProgress(0);

        const timestamp = Date.now();
        const filename = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const fullPath = `${path}${filename}`;
        const storageRef = ref(storage, fullPath);

        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(currentProgress);
            },
            (uploadError) => {
                const errorMsg = "Échec du téléversement. Vérifiez les règles de sécurité de Firebase Storage.";
                setError(errorMsg);
                onError?.(errorMsg);
                setIsUploading(false);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    onSuccess?.(downloadURL, fullPath);
                    setIsUploading(false);
                }).catch(urlError => {
                     const errorMsg = "Impossible de récupérer l'URL de l'image après le téléversement.";
                     setError(errorMsg);
                     onError?.(errorMsg);
                     setIsUploading(false);
                });
            }
        );
    };

    const remove = async (filePath: string) => {
        setIsDeleting(true);
        setError(null);
        try {
            const storageRef = ref(storage, filePath);
            await deleteObject(storageRef);
            onDeleteSuccess?.();
        } catch(err: any) {
             const errorMsg = "Échec de la suppression de l'image.";
             setError(errorMsg);
             onError?.(errorMsg);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const getPathFromUrl = (url: string): string | null => {
        try {
            const urlObject = new URL(url);
            if (urlObject.hostname === 'firebasestorage.googleapis.com') {
                const decodedPath = decodeURIComponent(urlObject.pathname);
                // The path starts with /v0/b/{bucket}/o/{path}
                const path = decodedPath.substring(decodedPath.indexOf('/o/') + 3);
                return path;
            }
            return null;
        } catch (e) {
            return null;
        }
    }


    return {
        upload,
        remove,
        getPathFromUrl,
        isUploading,
        isDeleting,
        progress,
        error
    };
}
