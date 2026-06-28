'use client';

import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { SafeImage } from "@/components/ui/safe-image";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, Calendar, Building } from "lucide-react";
import { useSchoolData } from "@/hooks/use-school-data";
import type { SettingsFormValues } from "./settings-schema";

export function SettingsHeroHeader() {
  const { schoolId, schoolData } = useSchoolData();
  const { control, setValue, handleSubmit } = useFormContext<SettingsFormValues>();

  const name = useWatch({ control, name: 'name' });
  const currentAcademicYear = useWatch({ control, name: 'currentAcademicYear' });
  const address = useWatch({ control, name: 'address' });
  const mainLogoUrl = useWatch({ control, name: 'mainLogoUrl' });

  const handleLogoUploadComplete = (url: string) => {
    setValue('mainLogoUrl', url, { shouldDirty: true });
    // Note: We'll rely on the global save button instead of auto-saving on upload to avoid prop drilling handleSubmit
    // If auto-save is strictly needed, we can trigger a custom event or pass an onSubmit handler via context.
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-4 md:p-6 md:p-12 border shadow-inner"
    >
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/60 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-xl border-2 border-white bg-white/80 backdrop-blur-md shadow-2xl flex items-center justify-center p-2 overflow-hidden">
            <SafeImage src={mainLogoUrl} alt="Logo" width={120} height={120} className="object-contain" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageUploader
                onUploadComplete={handleLogoUploadComplete}
                storagePath={`ecoles/${schoolId}/logos/`}
                resizeWidth={300}
              >
                <Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/20 h-10 w-10">
                  <Upload className="h-6 w-6" />
                </Button>
              </ImageUploader>
            </div>
          </div>
        </div>
        <div className="text-center md:text-left space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider backdrop-blur-md border border-primary/20">
            <CheckCircle className="h-3 w-3" />
            ID: {schoolData?.matricule || "Établissement Actif"}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground/90">
            {name || "Mon Établissement"}
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5 bg-white/40 border px-3 py-1 rounded-full backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-primary/60" />
              {currentAcademicYear || "2024-2025"}
            </span>
            <span className="flex items-center gap-1.5 bg-white/40 border px-3 py-1 rounded-full backdrop-blur-sm">
              <Building className="h-4 w-4 text-primary/60" />
              {address || "Adresse non définie"}
            </span>
          </div>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
    </motion.div>
  );
}
