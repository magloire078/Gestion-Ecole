'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useStorageUploader } from '@/hooks/use-storage-uploader';
import Image from 'next/image';
import { Loader2, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  storagePath: string;
  currentImage?: string;
  className?: string;
  children: React.ReactNode;
}

export function ImageUploader({ 
    onUploadComplete, 
    storagePath, 
    children, 
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
    toast({
      variant: 'destructive',
      title: 'Erreur de téléversement',
      description: errorMessage,
    });
  };

  const { uploadFile, isUploading, progress, error } = useStorageUploader({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file, storagePath);
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
        accept="image/*"
        disabled={isUploading}
      />
      
      <div 
        onClick={triggerFileSelect} 
        className={cn("cursor-pointer relative", isUploading && "cursor-not-allowed")}
      >
        {children}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            {isUploading ? (
                <div className="w-16 h-16 flex items-center justify-center bg-background/80 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-background/80 rounded-full">
                    <Camera className="h-5 w-5" />
                </div>
            )}
        </div>
      </div>
      
      {isUploading && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-full px-2">
          <Progress value={progress} className="h-1 w-full" />
        </div>
      )}

    </div>
  );
}