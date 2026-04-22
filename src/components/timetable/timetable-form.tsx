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
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { checkTimetableConflicts } from '@/lib/timetable-utils';
import { useTimetable } from '@/hooks/use-timetable';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SubjectColorCircleProps {
    color: string;
    className?: string;
}

const SubjectColorCircle = ({ color, className }: SubjectColorCircleProps) => {
    const circleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (circleRef.current) {
            circleRef.current.style.backgroundColor = color;
        }
    }, [color]);

    return <div ref={circleRef} className={className} />;
};

const timetableSchema = z.object({
    classId: z.string().min(1, { message: "La classe est requise." }),
    teacherId: z.string().min(1, { message: "L'enseignant est requis." }),
    subject: z.string().min(1, { message: "La matière est requise." }),
    day: z.enum(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']),
    startTime: z.string().min(1, { message: "L'heure de début est requise." }),
    endTime: z.string().min(1, { message: "L'heure de fin est requise." }),
    color: z.string().optional(),
    classroom: z.string().optional(),
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
            classroom: "",
            ...defaultValues
        },
    });

    // Fetch all entries for conflict checking (even if we only see one class in the main view)
    const { timetable: allEntries } = useTimetable(schoolId, 'all');
    const [conflicts, setConflicts] = useState<string[]>([]);

    const watchFields = form.watch(['day', 'startTime', 'endTime', 'teacherId', 'classroom', 'classId']);

    useEffect(() => {
        const potentialConflicts = checkTimetableConflicts(
            {
                day: watchFields[0] as any,
                startTime: watchFields[1],
                endTime: watchFields[2],
                teacherId: watchFields[3],
                classroom: watchFields[4],
                classId: watchFields[5],
            },
            allEntries,
            entry?.id
        );
        setConflicts(potentialConflicts);
    }, [watchFields, allEntries, entry?.id]);

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
                classroom: values.classroom,
            };

            // Final safety check for conflicts
            const finalConflicts = checkTimetableConflicts(completeData, allEntries, entry?.id);
            if (finalConflicts.length > 0) {
                toast({ 
                    variant: "destructive", 
                    title: "Conflit détecté", 
                    description: finalConflicts[0] 
                });
                setIsSubmitting(false);
                return;
            }

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
            <form id="timetable-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="classId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Classe</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl font-bold">
                                            <SelectValue placeholder="Choisir une classe" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-2xl border-slate-100">
                                        {classes.map((cls) => (<SelectItem key={cls.id} value={cls.id} className="font-medium">{cls.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="teacherId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Enseignant</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl font-bold">
                                            <SelectValue placeholder="Choisir un enseignant" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-2xl border-slate-100">
                                        {teachers.map((teacher) => (<SelectItem key={teacher.id} value={teacher.id} className="font-medium">{`${teacher.firstName} ${teacher.lastName}`}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Matière</FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        const selectedSubject = subjects.find(s => s.name === value);
                                        if (selectedSubject?.color) {
                                            form.setValue('color', selectedSubject.color);
                                        }
                                    }}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl font-bold">
                                            <SelectValue placeholder="Choisir une matière">
                                                {field.value && (
                                                    <div className="flex items-center gap-2">
                                                        <SubjectColorCircle 
                                                            color={form.watch('color') || '#3b82f6'} 
                                                            className="w-3 h-3 rounded-full shadow-sm" 
                                                        />
                                                        <span>{field.value}</span>
                                                    </div>
                                                )}
                                            </SelectValue>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-2xl border-slate-100">
                                        {subjects.map((subject) => (
                                            <SelectItem key={subject.name} value={subject.name}>
                                                <div className="flex items-center gap-2">
                                                    <SubjectColorCircle 
                                                        color={subject.color || '#3b82f6'} 
                                                        className="w-3 h-3 rounded-full" 
                                                    />
                                                    <span className="font-medium">{subject.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="classroom"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Salle / Local</FormLabel>
                                <FormControl>
                                    <Input {...field} className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl font-bold px-4" placeholder="Ex: Salle 101" />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-6">
                    <FormField
                        control={form.control}
                        name="day"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Jour de la semaine</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-12 bg-white border-slate-100 rounded-2xl font-bold shadow-sm">
                                            <SelectValue placeholder="Choisir un jour" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-2xl border-slate-100">
                                        {daysOfWeek.map(day => (<SelectItem key={day} value={day} className="font-medium">{day}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Début</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 bg-white border-slate-100 rounded-2xl font-bold shadow-sm">
                                                <SelectValue placeholder="00:00" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-2xl border-slate-100">
                                            {timeSlots.map(time => (<SelectItem key={time} value={time} className="font-mono">{time}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="endTime"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest text-slate-400">Fin</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 bg-white border-slate-100 rounded-2xl font-bold shadow-sm">
                                                <SelectValue placeholder="00:00" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-2xl border-slate-100">
                                            {timeSlots.map(time => (<SelectItem key={time} value={time} className="font-mono">{time}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>

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
                                <div className="mt-2 flex items-center gap-2 text-indigo-600 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                    <p className="text-xs font-black uppercase tracking-tighter">
                                        Durée totale : {hours > 0 && `${hours} heure${hours > 1 ? 's' : ''} `}{minutes > 0 && `${minutes} minute${minutes > 1 ? 's' : ''}`}
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>

                {conflicts.length > 0 && (
                    <Alert variant="destructive" className="bg-rose-50 border-rose-100 rounded-3xl p-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <AlertCircle className="h-5 w-5 text-rose-600" />
                        <div className="space-y-1">
                            <AlertTitle className="text-sm font-black text-rose-900 uppercase tracking-tight">Conflit de planification</AlertTitle>
                            <AlertDescription className="text-xs text-rose-700 font-medium leading-relaxed">
                                {conflicts[0]}
                            </AlertDescription>
                        </div>
                    </Alert>
                )}

                <DialogFooter className="pt-6 border-t border-slate-100 gap-3">
                    <Button type="button" variant="ghost" onClick={onCancel} className="h-12 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50">Annuler</Button>
                    <Button type="submit" disabled={isSubmitting} className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95">
                        {isSubmitting ? 'Enregistrement...' : entry ? 'Mettre à jour' : 'Confirmer la création'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
