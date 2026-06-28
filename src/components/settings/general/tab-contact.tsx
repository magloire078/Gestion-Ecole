'use client';

import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Phone, Mail, Globe } from "lucide-react";
import type { SettingsFormValues } from "./settings-schema";

export function TabContact() {
  const { control } = useFormContext<SettingsFormValues>();

  return (
    <div className="space-y-6 mt-0">
      <Card className="rounded-xl border-none shadow-2xl shadow-primary/5 bg-white/80 backdrop-blur-xl border border-white/20 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField control={control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 font-bold"><Phone className="h-4 w-4 text-primary" />Téléphone</FormLabel>
              <FormControl><Input type="tel" className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 font-bold"><Mail className="h-4 w-4 text-primary" />Email de Contact</FormLabel>
              <FormControl><Input type="email" placeholder="contact@ecole.com" className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="md:col-span-2">
            <FormField control={control} name="website" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 font-bold"><Globe className="h-4 w-4 text-primary" />Site Internet</FormLabel>
                <FormControl><Input type="url" placeholder="https://www.votre-école.com" className="rounded-xl h-14 bg-neutral-100/50 border-transparent focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium text-lg" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>
      </Card>
    </div>
  );
}
