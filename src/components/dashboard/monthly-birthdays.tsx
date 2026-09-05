'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Gift } from "lucide-react";
import { motion } from 'framer-motion';
import { useMemo } from "react";
import { useStudents } from "@/hooks/use-students";
import { useUserSession } from "@/hooks/use-user-session";

export function MonthlyBirthdays() {
    const { schoolId } = useUserSession();
    const { students } = useStudents(schoolId, 'all', 'active');
    
    const birthdays = useMemo(() => {
        if (!students) return [];
        const currentMonth = new Date().getMonth();
        return students.filter(s => {
            if (!s.dateOfBirth) return false;
            const dob = new Date(s.dateOfBirth);
            return dob.getMonth() === currentMonth;
        }).sort((a, b) => {
            return new Date(a.dateOfBirth!).getDate() - new Date(b.dateOfBirth!).getDate();
        });
    }, [students]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="h-full"
        >
            <Card className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-2xl relative overflow-hidden h-full">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl opacity-50" />
                
                <CardHeader>
                    <CardTitle className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-amber-500" />
                        Anniversaires du mois
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col space-y-3">
                    {birthdays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <p className="text-sm font-bold text-slate-700">Aucun anniversaire</p>
                            <p className="text-xs text-slate-500 mt-1">Ce mois-ci est bien calme !</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {birthdays.map((student, i) => {
                                const date = new Date(student.dateOfBirth!);
                                const day = date.getDate();
                                const isToday = day === new Date().getDate();
                                
                                return (
                                    <motion.div 
                                        key={student.id} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 + i * 0.1 }}
                                        className={`flex items-center justify-between p-3 rounded-xl border shadow-sm ${
                                            isToday 
                                            ? 'bg-amber-50 border-amber-200' 
                                            : 'bg-white/60 border-white/80'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                {student.firstName} {student.lastName}
                                                {isToday && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Aujourd'hui!</span>}
                                            </span>
                                            <span className="text-xs text-slate-500">Classe : {student.class}</span>
                                        </div>
                                        <div className="flex flex-col items-center justify-center bg-white rounded-lg px-3 py-1 shadow-sm border border-slate-100">
                                            <span className="text-xs text-slate-400 uppercase font-bold">Jour</span>
                                            <span className="text-lg font-black text-slate-700 leading-none">{day}</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
