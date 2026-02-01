'use client';

import * as React from "react";
import { useState, useEffect, useRef } from 'react';
import { useStorage } from '@/firebase/client-provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resizeImage } from '@/lib/image-optimization';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  storagePath: string;
  currentImageUrl?: string | null;
  resizeWidth?: number;
  children?: React.ReactNode;
  className?: string;
  maxSize?: number;
}

export function ImageUploader({ 
  onUploadComplete, 
  storagePath, 
  currentImageUrl, 
  resizeWidth = 400,
  children,
  className,
  maxSize = 2 * 1024 * 1024 // 2MB default
}: ImageUploaderProps) {
  const storage = useStorage();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    if (!file.type.match('image.*')) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: `L'image ne doit pas dépasser ${maxSize / (1024*1024)} Mo`,
      });
      return;
    }

    try {
      setUploading(true);
      const imageBlob = await resizeImage(file, resizeWidth);

      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const storageRef = ref(storage, `${storagePath}${fileName}`);
      await uploadBytes(storageRef, imageBlob);
      const downloadUrl = await getDownloadURL(storageRef);
      onUploadComplete(downloadUrl);
      
      toast({
        title: "Image téléchargée",
        description: "La photo a été téléchargée avec succès",
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        variant: "destructive",
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger l'image. Veuillez réessayer.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUploadComplete(''); 
  };
  
  const uniqueId = React.useId();

  return (
    <div className={cn("relative", className)}>
        <input
            type="file"
            ref={fileInputRef}
            id={`image-upload-input-${uniqueId}`}
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
        />
        <label
            htmlFor={`image-upload-input-${uniqueId}`}
            className={cn(
                "cursor-pointer",
                uploading && "opacity-50 cursor-not-allowed"
            )}
        >
            {children}
        </label>
        
        {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )}

        {currentImageUrl && !uploading && (
            <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 z-10"
                onClick={handleRemoveImage}
                aria-label="Supprimer l'image"
            >
                <X className="h-3 w-3" />
            </Button>
        )}
    </div>
  );
}
