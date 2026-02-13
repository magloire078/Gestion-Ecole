'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TimetableService } from '@/services/timetable-service';
import type { class_type as Class, staff as Staff, timetableEntry, subject as Subject } from '@/lib/data-types';
import { useState, useEffect } from 'react';

const timetableSchema = z.object({
    classId: z.string().min(1, { message: "La classe est requise." }),
    teacherId: z.string().min(1, { message: "L'enseignant est requis." }),
    subject: z.string().min(1, { message: "La matière est requise." }),
    day: z.enum(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']),
    startTime: z.string().min(1, { message: "L'heure de début est requise." }),
    endTime: z.string().min(1, { message: "L'heure de fin est requise." }),
    color: z.string().optional(),
});

type TimetableFormValues = z.infer<typeof timetableSchema>;

const daysOfWeek: TimetableFormValues['day'][] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Time slots with 30-minute intervals for better flexibility
const timeSlots = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
];


interface TimetableFormProps {
    schoolId: string;
    entry: timetableEntry | null;
    classes: (Class & { id: string })[];
    teachers: (Staff & { id: string })[];
    subjects: Subject[];
    onSave: () => void;
    onCancel: () => void;
    defaultValues?: Partial<TimetableFormValues>;
}

export function TimetableForm({ schoolId, entry, classes, teachers, subjects, onSave, onCancel, defaultValues }: TimetableFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<TimetableFormValues>({
        resolver: zodResolver(timetableSchema),
        defaultValues: {
            classId: "",
            teacherId: "",
            subject: "",
            day: "Lundi",
            startTime: "08:00",
            endTime: "09:00",
            color: '#3b82f6',
            ...defaultValues
        },
    });

    useEffect(() => {
        if (entry) {
            form.reset({
                classId: entry.classId,
                teacherId: entry.teacherId,
                subject: entry.subject,
                day: entry.day,
                startTime: entry.startTime,
                endTime: entry.endTime,
                color: entry.color,
            });
        } else if (defaultValues) {
            form.reset({
                ...form.getValues(),
                ...defaultValues
            });
        }
    }, [entry, defaultValues, form]);

    const handleSubmit = async (values: TimetableFormValues) => {
        if (!schoolId) {
            toast({ variant: "destructive", title: "Erreur", description: "ID de l'école non trouvé." });
            return;
        }
        setIsSubmitting(true);

        try {
            const completeData: Omit<timetableEntry, 'id'> = {
                schoolId,
                classId: values.classId || '',
                teacherId: values.teacherId || '',
                subject: values.subject || '',
                day: values.day,
                startTime: values.startTime || '',
                endTime: values.endTime || '',
                color: values.color,
            };

            if (entry) {
                await TimetableService.updateEntry(schoolId, entry.id!, completeData);
            } else {
                await TimetableService.createEntry(schoolId, completeData);
            }
            toast({ title: `Entrée ${entry ? 'modifiée' : 'ajoutée'}`, description: "L'emploi du temps a été mis à jour." });
            onSave();
        } catch (error) {
            console.error("Error saving timetable entry:", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer l'entrée." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form id="timetable-form" onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Classe</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl className="col-span-3">
                                    <SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {classes.map((cls) => (<SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="teacherId"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Enseignant</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl className="col-span-3">
                                    <SelectTrigger><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {teachers.map((teacher) => (<SelectItem key={teacher.id} value={teacher.id}>{`${teacher.firstName} ${teacher.lastName}`}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Matière</FormLabel>
                            <Select
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    // Auto-update color when subject is selected
                                    const selectedSubject = subjects.find(s => s.name === value);
                                    if (selectedSubject?.color) {
                                        form.setValue('color', selectedSubject.color);
                                    }
                                }}
                                value={field.value}
                            >
                                <FormControl className="col-span-3">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une matière">
                                            {field.value && (
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: form.watch('color') || '#3b82f6' }}
                                                    />
                                                    <span>{field.value}</span>
                                                </div>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {subjects.map((subject) => (
                                        <SelectItem key={subject.name} value={subject.name}>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: subject.color || '#3b82f6' }}
                                                />
                                                <span>{subject.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="day"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Jour</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl className="col-span-3">
                                    <SelectTrigger><SelectValue placeholder="Sélectionner un jour" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {daysOfWeek.map(day => (<SelectItem key={day} value={day}>{day}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Début</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl className="col-span-3">
                                    <SelectTrigger><SelectValue placeholder="Heure de début" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {timeSlots.map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Fin</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl className="col-span-3">
                                    <SelectTrigger><SelectValue placeholder="Heure de fin" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {timeSlots.map(time => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="col-start-2 col-span-3" />
                        </FormItem>
                    )}
                />

                {/* Duration helper */}
                {form.watch('startTime') && form.watch('endTime') && (() => {
                    const start = form.watch('startTime').split(':').map(Number);
                    const end = form.watch('endTime').split(':').map(Number);
                    const startMinutes = start[0] * 60 + start[1];
                    const endMinutes = end[0] * 60 + end[1];
                    const durationMinutes = endMinutes - startMinutes;
                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;

                    if (durationMinutes > 0) {
                        return (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="col-start-2 col-span-3">
                                    <p className="text-sm text-muted-foreground">
                                        Durée : {hours > 0 && `${hours}h`}{minutes > 0 && `${minutes}min`}
                                    </p>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
