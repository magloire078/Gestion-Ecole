
'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useImageUpload } from '@/hooks/use-image-upload';
import Image from 'next/image';
import { Loader2, Upload, Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  onDeleteComplete?: () => void;
  storagePath: string;
  currentImageUrl?: string;
  className?: string;
  children: React.ReactNode;
}

export function ImageUploader({ 
    onUploadComplete,
    onDeleteComplete,
    storagePath, 
    currentImageUrl,
    children, 
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [localPreview, setLocalPreview] = useState<string | null>(currentImageUrl || null);
  
  useEffect(() => {
    setLocalPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleSuccess = (url: string) => {
    onUploadComplete(url);
    setLocalPreview(url);
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

  const handleDeleteSuccess = () => {
    setLocalPreview(null);
    onDeleteComplete?.();
    toast({
      title: 'Image supprimée',
      description: "L'image a été supprimée avec succès.",
    });
  };

  const { upload, remove, getPathFromUrl, isUploading, isDeleting, progress } = useImageUpload({
    onSuccess: handleSuccess,
    onError: handleError,
    onDeleteSuccess: handleDeleteSuccess
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setLocalPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      upload(file, storagePath);
    }
  };

  const triggerFileSelect = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };
  
  const handleDelete = () => {
    if (!currentImageUrl) return;
    const path = getPathFromUrl(currentImageUrl);
    if(path) {
        remove(path);
    } else {
        toast({ variant: 'destructive', title: "Erreur", description: "Impossible de déterminer le chemin de l'image pour la suppression."})
    }
  }
  
  const isLoading = isUploading || isDeleting;

  return (
    <div className="relative group">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={isLoading}
      />
      
      <div className={cn("cursor-pointer relative", isLoading && "cursor-not-allowed")}>
        {children}
        <div 
          onClick={triggerFileSelect}
          className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
            {isLoading ? (
                <div className="w-16 h-16 flex items-center justify-center bg-background/80 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-background/80 rounded-full">
                    <Camera className="h-5 w-5" />
                </div>
            )}
        </div>
        {currentImageUrl && (
            <Button 
                type="button"
                variant="destructive" 
                size="icon" 
                className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDelete}
                disabled={isLoading}
            >
                <Trash2 className="h-3 w-3" />
            </Button>
        )}
      </div>
      
      {isUploading && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-full px-2">
          <Progress value={progress} className="h-1 w-full" />
        </div>
      )}

    </div>
  );
}
