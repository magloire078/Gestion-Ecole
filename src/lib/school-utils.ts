
'use client';
import type { class_type as Class, fee as Fee, niveau as Niveau } from '@/lib/data-types';

export const getTuitionInfoForClass = (classId: string, classes: (Class & {id?: string})[], niveaux: (Niveau & {id?: string})[], fees: Fee[]) => {
    if (!classId || !classes.length || !niveaux.length || !fees.length) {
        return { fee: 0, gradeName: 'N/A' };
    }
    
    const selectedClass = classes.find(c => c.id === classId);
    if (!selectedClass) {
        return { fee: 0, gradeName: 'N/A' };
    }
    
    const gradeName = selectedClass.grade;
    if(!gradeName) {
        return { fee: 0, gradeName: 'N/A' };
    }
    
    const feeInfo = fees.find(f => f.grade === gradeName);
    const feeAmount = feeInfo ? parseFloat(feeInfo.amount) : 0;
    
    // Add a check to ensure the parsed amount is a valid number
    if (isNaN(feeAmount)) {
        console.warn(`Invalid fee amount found for grade "${gradeName}": ${feeInfo?.amount}`);
        return { fee: 0, gradeName: gradeName };
    }

    return { fee: feeAmount, gradeName: gradeName };
};
