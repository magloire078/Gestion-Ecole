
'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Upload } from 'lucide-react';
import { useStorageUploader } from '@/hooks/use-storage-uploader';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  storagePath: string; // e.g., 'schoolLogos/' or 'studentAvatars/'
  children: React.ReactNode;
}

export function ImageUploader({ onUploadComplete, storagePath, children }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleSuccess = (url: string) => {
      onUploadComplete(url);
      toast({
        title: 'Téléversement réussi',
        description: "L'image a été enregistrée.",
      });
  };

  const handleError = (errorMessage: string) => {
      toast({
          variant: 'destructive',
          title: 'Erreur de téléversement',
          description: errorMessage,
      });
  };

  const { uploadFile, isUploading, progress, error } = useStorageUploader({ 
      onSuccess: handleSuccess, 
      onError: handleError 
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file, storagePath);
    }
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
        <div onClick={triggerFileSelect} className="cursor-pointer">
            {children}
        </div>
        
        <Dialog open={isUploading}>
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
