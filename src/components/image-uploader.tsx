'use client';

import { useState, useRef } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  storagePath: string; // e.g., 'schoolLogos/' or 'studentAvatars/'
  children: React.ReactNode;
}

export function ImageUploader({ onUploadComplete, storagePath, children }: ImageUploaderProps) {
  const firebaseApp = useFirebaseApp();
  const storage = getStorage(firebaseApp);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError("Veuillez sélectionner un fichier image (jpg, png, etc.).");
        return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    const fileName = `${new Date().getTime()}_${file.name}`;
    const fullPath = `${storagePath}${fileName}`;
    const storageRef = ref(storage, fullPath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        setError("Échec du téléversement. Vérifiez les règles de sécurité de Firebase Storage.");
        setIsUploading(false);
        toast({
          variant: 'destructive',
          title: 'Erreur de téléversement',
          description: error.message,
        });
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          onUploadComplete(downloadURL);
          setIsUploading(false);
          toast({
            title: 'Téléversement réussi',
            description: "L'image a été enregistrée.",
          });
        });
      }
    );
  };
  
  const triggerFileSelect = () => {
      fileInputRef.current?.click();
  }

  return (
    <>
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
        />
        <div onClick={triggerFileSelect}>
            {children}
        </div>
        
        <Dialog open={isUploading} onOpenChange={setIsUploading}>
            <DialogContent hideCloseButton>
                <DialogHeader>
                    <DialogTitle>Téléversement en cours...</DialogTitle>
                    <DialogDescription>
                        Veuillez patienter pendant que votre image est téléversée.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <Progress value={progress} />
                    <p className="text-center text-sm text-muted-foreground">{Math.round(progress)}%</p>
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
}
