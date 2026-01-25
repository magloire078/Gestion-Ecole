'use client';

import { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';
import { resizeImage } from '@/lib/image-optimization';


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

    const upload = async (file: File, path: string, resizeWidth: number = 1024) => {
        setIsUploading(true);
        setError(null);
        setProgress(0);

        try {
            const imageBlob = await resizeImage(file, resizeWidth);
            
            const timestamp = Date.now();
            const filename = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
            const fullPath = `${path}${filename}`;
            const storageRef = ref(storage, fullPath);

            const uploadTask = uploadBytesResumable(storageRef, imageBlob);

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
        } catch (resizeError: any) {
            const errorMsg = `Erreur lors du redimensionnement de l'image: ${resizeError.message}`;
            setError(errorMsg);
            onError?.(errorMsg);
            setIsUploading(false);
        }
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
            // Check if the URL is from Firebase Storage
            if (url.includes('firebasestorage.googleapis.com')) {
                const decodedUrl = decodeURIComponent(url);
                // Extract the path after '/o/'
                const path = decodedUrl.split('/o/')[1].split('?')[0];
                return path;
            }
            return null;
        } catch (e) {
            console.error("Error parsing URL:", e);
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
