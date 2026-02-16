'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Camera, Upload, Check, X, Loader2, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StudentService } from '@/services/student-services';

interface StudentPhotoUploadProps {
    schoolId: string;
    studentId: string;
    currentPhotoUrl?: string;
    onUploadSuccess?: (newUrl: string) => void;
}

export const StudentPhotoUpload: React.FC<StudentPhotoUploadProps> = ({
    schoolId,
    studentId,
    currentPhotoUrl,
    onUploadSuccess
}) => {
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setImage(reader.result as string);
                setIsDialogOpen(true);
            };
        }
    };

    const handleUpload = async () => {
        if (!image || !croppedAreaPixels) return;

        setIsUploading(true);
        try {
            const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error("Échec du recadrage");

            // Conversion du Blob en Base64
            const reader = new FileReader();
            reader.readAsDataURL(croppedImageBlob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                console.log("[StudentPhotoUpload] Base64 conversion successful, length:", base64data.length);

                await StudentService.updateStudentPhoto(schoolId, studentId, base64data);

                toast({ title: "Photo mise à jour", description: "La photo de l'élève a été enregistrée avec succès." });
                setIsDialogOpen(false);
                if (onUploadSuccess) onUploadSuccess(base64data);
                setIsUploading(false);
            };
        } catch (error) {
            console.error("Upload error:", error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour la photo." });
            setIsUploading(false);
        }
    };

    return (
        <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-muted bg-muted flex items-center justify-center relative">
                {currentPhotoUrl ? (
                    <img src={currentPhotoUrl} alt="Élève" className="w-full h-full object-cover" />
                ) : (
                    <GraduationCap className="w-16 h-16 text-muted-foreground opacity-20" />
                )}

                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-8 h-8 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Recadrer la photo d&apos;identité</DialogTitle>
                    </DialogHeader>

                    <div className="relative h-[300px] w-full bg-slate-900 mt-4 rounded-md overflow-hidden">
                        {image && (
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // 1:1 ratio
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>

                    <div className="mt-4 flex items-center gap-4">
                        <span className="text-sm font-medium">Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                            <X className="mr-2 h-4 w-4" /> Annuler
                        </Button>
                        <Button onClick={handleUpload} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Enregistrer la photo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
