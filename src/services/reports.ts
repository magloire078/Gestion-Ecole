
import { Firestore, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { accountingTransaction as AccountingTransaction, student as Student } from '@/lib/data-types';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface MonthlyReportData {
    monthName: string;
    year: number;
    totalRevenue: number;
    totalExpenses: number;
    netBalance: number;
    revenueByCategory: { category: string; amount: number }[];
    expenseByCategory: { category: string; amount: number }[];
    topExpenses: { description: string; amount: number }[];
    tuitionRecoveryRate: number;
}

export class ReportService {
    constructor(private firestore: Firestore) { }

    async getMonthlyFinanceData(
        schoolId: string,
        date: Date,
        academicYear?: string,
    ): Promise<MonthlyReportData> {
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const transactionsRef = collection(this.firestore, `ecoles/${schoolId}/comptabilite`);
        const q = query(
            transactionsRef,
            where('date', '>=', format(start, 'yyyy-MM-dd')),
            where('date', '<=', format(end, 'yyyy-MM-dd'))
        );

        const snapshot = await getDocs(q);
        const allTransactions = snapshot.docs.map(doc => doc.data() as AccountingTransaction);

        // Si une année est fournie, on filtre :
        // - les docs taggués (academicYear === year) → toujours visibles
        // - les docs legacy (sans tag) → visibles uniquement si c'est la
        //   période courante (sinon ils seraient mélangés à une archive).
        const transactions = academicYear
            ? allTransactions.filter(t => !t.academicYear || t.academicYear === academicYear)
            : allTransactions;

        const revenueMap = new Map<string, number>();
        const expenseMap = new Map<string, number>();
        let totalRevenue = 0;
        let totalExpenses = 0;

        transactions.forEach(t => {
            if (t.type === 'Revenu') {
                totalRevenue += t.amount;
                revenueMap.set(t.category, (revenueMap.get(t.category) || 0) + t.amount);
            } else {
                totalExpenses += t.amount;
                expenseMap.set(t.category, (expenseMap.get(t.category) || 0) + t.amount);
            }
        });

        // Taux de recouvrement : élèves actifs de l'année cible si possible.
        const studentsRef = collection(this.firestore, `ecoles/${schoolId}/eleves`);
        const studentsQuery = academicYear
            ? query(studentsRef, where('status', '==', 'Actif'), where('inscriptionYear', '==', academicYear))
            : query(studentsRef, where('status', '==', 'Actif'));
        let studentsSnapshot = await getDocs(studentsQuery);
        // Fallback : si aucun élève ne porte inscriptionYear (école pré-bascule),
        // on retombe sur tous les actifs pour ne pas afficher 0 %.
        if (academicYear && studentsSnapshot.empty) {
            studentsSnapshot = await getDocs(query(studentsRef, where('status', '==', 'Actif')));
        }
        const students = studentsSnapshot.docs.map(doc => doc.data() as Student);

        const totalExpected = students.reduce((sum, s) => sum + (s.tuitionFee || 0), 0);
        const totalDue = students.reduce((sum, s) => sum + (s.amountDue || 0), 0);
        const recoveryRate = totalExpected > 0 ? ((totalExpected - totalDue) / totalExpected) * 100 : 0;

        return {
            monthName: format(date, 'MMMM', { locale: fr }),
            year: date.getFullYear(),
            totalRevenue,
            totalExpenses,
            netBalance: totalRevenue - totalExpenses,
            revenueByCategory: Array.from(revenueMap, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
            expenseByCategory: Array.from(expenseMap, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
            topExpenses: transactions
                .filter(t => t.type === 'Dépense')
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map(t => ({ description: t.description, amount: t.amount })),
            tuitionRecoveryRate: recoveryRate
        };
    }
}
