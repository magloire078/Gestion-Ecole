'use client';

import { useState, useRef } from 'react';
import { useImageUpload } from '@/hooks/use-image-upload';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: string) => void;
  storagePath: string;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  resizeWidth?: number;
  children: React.ReactNode;
  currentImageUrl?: string | null;
}

export function ImageUploader({ 
    onUploadComplete,
    onUploadError,
    storagePath,
    maxSize = 2 * 1024 * 1024, // 2MB default
    acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    resizeWidth = 1024,
    children,
    ...props
}: ImageUploaderProps) {
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
    onUploadError?.(errorMessage);
    toast({
      variant: 'destructive',
      title: 'Erreur de téléversement',
      description: errorMessage,
    });
  };
  
  const { upload, isUploading, progress } = useImageUpload({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        handleError(`La taille du fichier dépasse la limite de ${maxSize / 1024 / 1024}MB.`);
        return;
      }
      if (!acceptedTypes.includes(file.type)) {
         handleError(`Type de fichier non supporté. Types acceptés : ${acceptedTypes.join(', ')}.`);
        return;
      }
      upload(file, storagePath, resizeWidth);
    }
  };

  const triggerFileSelect = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="relative group">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={acceptedTypes.join(',')}
        disabled={isUploading}
      />
      
      <div className={cn("cursor-pointer", isUploading && "cursor-not-allowed")} onClick={triggerFileSelect}>
        {children}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-full transition-opacity">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <Progress value={progress} className="w-16 h-1 mt-2 bg-white/20 [&>div]:bg-white" />
          </div>
        )}
      </div>
    </div>
  );
}
