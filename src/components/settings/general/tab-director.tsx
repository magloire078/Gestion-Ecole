'use client';

import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSignature, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ImageUploader } from "@/components/image-uploader";
import { motion } from "framer-motion";
import { useSchoolData } from "@/hooks/use-school-data";
import type { SettingsFormValues } from "./settings-schema";

export function TabDirector() {
  const { schoolId } = useSchoolData();
  const { control, setValue } = useFormContext<SettingsFormValues>();

  const handleSignatureUploadComplete = (url: string) => {
    setValue('digitalSignatureUrl', url, { shouldDirty: true });
  }

  return (
    <div className="space-y-6 mt-0">
      <Card className="rounded-xl border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FormField control={control} name="directorFirstName" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Prénom</FormLabel>
              <FormControl><Input className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="directorLastName" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Nom</FormLabel>
              <FormControl><Input className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="directorPhone" render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Téléphone</FormLabel>
              <FormControl><Input type="tel" className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <Separator className="opacity-50" />

        <FormField control={control} name="digitalSignatureUrl" render={({ field }) => (
          <FormItem className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-1">
                <FormLabel className="flex items-center gap-2 text-xl font-black tracking-tight">
                  <FileSignature className="h-6 w-6 text-primary" />
                  Signature Numérique
                </FormLabel>
                <FormDescription className="max-w-md text-sm leading-relaxed font-medium text-muted-foreground/80">
                  Cette signature apparaîtra sur tous les documents officiels générés par la plateforme (bulletins, certificats). Format PNG transparent recommandé pour un rendu optimal.
                </FormDescription>
              </div>
              <ImageUploader
                onUploadComplete={handleSignatureUploadComplete}
                storagePath={`ecoles/${schoolId}/signatures/`}
                resizeWidth={600}
              >
                <Button type="button" variant="outline" className="rounded-xl h-14 px-8 font-bold shadow-sm border-primary/20 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                  <Upload className="h-5 w-5 mr-3" />
                  Mettre à jour
                </Button>
              </ImageUploader>
            </div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              className="relative group max-w-sm mx-auto md:mx-0 overflow-hidden"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
              <div className="relative h-40 w-full rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 backdrop-blur-sm flex items-center justify-center overflow-hidden p-6">
                {field.value ? (
                  <img
                    src={field.value}
                    alt="Signature"
                    className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-primary/10">
                      <FileSignature className="h-8 w-8 text-primary opacity-40" />
                    </div>
                    <p className="text-xs uppercase font-black tracking-widest opacity-30 text-center">Aucune signature<br />enregistrée</p>
                  </div>
                )}
              </div>
            </motion.div>
            <FormMessage />
          </FormItem>
        )} />
      </Card>
    </div>
  );
}
