'use client';

import { useState, useEffect } from 'react';
import { useStorage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  onUploadComplete: (url: string) => void;
  storagePath: string;
  currentImageUrl?: string;
  resizeWidth?: number;
  children?: React.ReactNode;
  className?: string;
}

export function ImageUploader({ 
  onUploadComplete, 
  storagePath, 
  currentImageUrl, 
  resizeWidth = 400,
  children,
  className 
}: ImageUploaderProps) {
  const storage = useStorage();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  // Mettre à jour la preview quand currentImageUrl change
  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    // Vérifier le type de fichier
    if (!file.type.match('image.*')) {
      toast({
        variant: "destructive",
        title: "Format invalide",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
      });
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "L'image ne doit pas dépasser 5MB",
      });
      return;
    }

    try {
      setUploading(true);
      
      // Créer un nom de fichier unique
      const fileExtension = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const storageRef = ref(storage, `${storagePath}${fileName}`);
      
      // Uploader le fichier
      await uploadBytes(storageRef, file);
      
      // Récupérer l'URL de téléchargement
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Mettre à jour l'état et notifier le parent
      setPreviewUrl(downloadUrl);
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

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onUploadComplete(''); // Notifier le parent que l'image a été supprimée
  };

  return (
    <div className={cn("relative", className)}>
      <input
        type="file"
        id="image-upload"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <label htmlFor="image-upload" className="cursor-pointer">
        {children ? (
          children
        ) : (
          <div className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary transition-colors">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Télécharger</span>
              </>
            )}
          </div>
        )}
      </label>

      {previewUrl && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
          onClick={handleRemoveImage}
          disabled={uploading}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
    