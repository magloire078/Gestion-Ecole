import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().min(1, "Le nom de l'école est requis."),
  currentAcademicYear: z.string().regex(/^\d{4}-\d{4}$/, "Format invalide (ex: 2024-2025)").optional().or(z.literal('')),
  matricule: z.string().regex(/^[A-Z0-9\/-]*$/, { message: "Format de matricule invalide" }).optional().or(z.literal('')),
  cnpsEmployeur: z.string().regex(/^[0-9]*$/, { message: "Le numéro CNPS doit contenir uniquement des chiffres" }).optional().or(z.literal('')),
  directorFirstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  directorLastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  directorPhone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  phone: z.string().regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/, "Numéro de téléphone invalide").optional().or(z.literal('')),
  website: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  mainLogoUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  digitalSignatureUrl: z.string().url({ message: "URL invalide" }).optional().or(z.literal('')),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
