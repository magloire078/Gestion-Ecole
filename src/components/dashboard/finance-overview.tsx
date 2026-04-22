'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useUserSession } from '@/hooks/use-user-session';
import { useStudents } from '@/hooks/use-students';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Wallet, PieChart as PieChartIcon, TrendingUp, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/currency-utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface FinanceOverviewProps {
    schoolId: string;
}

export function FinanceOverview({ schoolId: propSchoolId }: FinanceOverviewProps) {
    const firestore = useFirestore();
    const { schoolId: sessionSchoolId, schoolData, isLoading: sessionLoading } = useUserSession();
    const schoolId = propSchoolId || sessionSchoolId;
    const country = schoolData?.country;

    const { students, loading: studentsLoading } = useStudents(schoolId, 'all', 'active');
    const loading = sessionLoading || studentsLoading;

    const financeStats = useMemo(() => {
        if (!students || students.length === 0) {
            return { totalFees: 0, totalDue: 0, paidPercentage: 0 };
        }

        const totalFees = students.reduce((sum: number, s: any) => sum + (s.tuitionFee || 0), 0);
        const totalDue = students.reduce((sum: number, s: any) => sum + (s.amountDue || 0), 0);
        const paidPercentage = totalFees > 0 ? ((totalFees - totalDue) / totalFees) * 100 : 100;

        return { totalFees, totalDue, paidPercentage };
    }, [students]);

    const chartData = useMemo(() => [
        { name: 'Encaissé', value: financeStats.totalFees - financeStats.totalDue, color: 'hsl(var(--primary))' },
        { name: 'Solde Dû', value: financeStats.totalDue, color: 'rgba(239, 68, 68, 0.4)' },
    ], [financeStats]);

    if (loading) {
        return (
            <Card className="glass-card border-white/10 bg-card/40 backdrop-blur-2xl shadow-2xl">
                <CardHeader>
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-full"
        >
            <Card className="glass-card border-white/10 bg-card/40 backdrop-blur-2xl h-full overflow-hidden relative shadow-2xl group flex flex-col">
                {/* 3D Light Source Effect */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-primary" />
                                Finances
                            </CardTitle>
                            <CardDescription className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest">
                                État des scolarités
                            </CardDescription>
                        </div>
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 flex-1 pt-4">
                    <div className="h-44 w-full relative">
                        {/* Custom SVG Shadows for PieChart */}
                        <svg className="h-0 w-0 absolute pointer-events-none" aria-hidden="true">
                            <defs>
                                <filter id="pie-glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                        </svg>

                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color}
                                            style={{ filter: 'url(#pie-glow)' }}
                                            className="transition-all duration-300 hover:opacity-80"
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(255,255,255,0.8)', 
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black tracking-tighter">{financeStats.paidPercentage.toFixed(0)}%</span>
                            <span className="text-[9px] uppercase font-black text-muted-foreground/60 leading-none">Collecté</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 p-3 rounded-2xl bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
                            <span className="text-[10px] uppercase font-black text-muted-foreground/40 leading-none block">Recettes</span>
                            <span className="text-sm font-black text-foreground drop-shadow-sm">{formatCurrency(financeStats.totalFees - financeStats.totalDue, country)}</span>
                        </div>
                        <div className="space-y-1 p-3 rounded-2xl bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
                            <span className="text-[10px] uppercase font-black text-muted-foreground/40 leading-none block">Restant</span>
                            <span className="text-sm font-black text-destructive drop-shadow-sm">{formatCurrency(financeStats.totalDue, country)}</span>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pt-2">
                    <Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 font-black uppercase text-[11px] tracking-[0.2em] group/btn overflow-hidden relative" asChild>
                        <Link href="/dashboard/paiements">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shine_1s_ease-in-out_infinite]" />
                            <Wallet className="mr-2 h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                            Accéder à la caisse
                            <ArrowUpRight className="ml-2 h-3 w-3 opacity-0 group-hover/btn:opacity-100 transition-all duration-300 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}
