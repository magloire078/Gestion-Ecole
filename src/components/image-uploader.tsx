'use client';

import * as React from "react";
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resizeImage } from '@/lib/image-optimization';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  storagePath?: string;
  currentImageUrl?: string | null;
  resizeWidth?: number;
  children?: React.ReactNode;
  className?: string;
  maxSize?: number;
  useBase64?: boolean;
  showOverlay?: boolean;
}

export function ImageUploader({
  onUploadComplete,
  storagePath,
  currentImageUrl,
  resizeWidth = 400,
  children,
  className,
  maxSize = 1 * 1024 * 1024, // 1MB max pour Base64 dans Firestore
  useBase64 = true,
  showOverlay = true
}: ImageUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        description: `L'image ne doit pas dépasser ${maxSize / (1024 * 1024)} Mo`,
      });
      return;
    }

    try {
      setUploading(true);

      const targetWidth = resizeWidth || 400;
      const resizedBlob = await resizeImage(file, targetWidth);

      if (useBase64) {
        const reader = new FileReader();
        reader.readAsDataURL(resizedBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onUploadComplete(base64data);
          setUploading(false);
          toast({
            title: "Succès",
            description: "Image prête.",
          });
        };
        return;
      }
    } catch (error: any) {
      console.error("[ImageUploader] Error:", error);
      setUploading(false);
      toast({
        title: "Erreur",
        description: "Impossible de traiter l'image.",
        variant: "destructive",
      });
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUploadComplete("");
  };

  return (
    <div
      className={cn(
        "relative group cursor-pointer overflow-hidden transition-all duration-200",
        !children && "h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex items-center justify-center bg-muted/50",
        className
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        disabled={uploading}
      />

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20 rounded-inherit">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {children ? (
        <>
          {children}
          {showOverlay && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-inherit z-10 pointer-events-none">
              <Upload className="h-6 w-6 text-white" />
            </div>
          )}
        </>
      ) : (
        <>
          {currentImageUrl ? (
            <>
              <img
                src={currentImageUrl}
                alt="Profil"
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <button
                onClick={removeImage}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 z-20"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-muted-foreground group-hover:text-primary transition-colors">
              <Upload className="h-8 w-8 mb-2" />
              <span className="text-xs font-medium text-center leading-tight">Cliquer pour uploader</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
