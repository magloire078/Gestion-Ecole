import { Firestore, collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { format } from 'date-fns';
import type { canteenReservation, canteenDailyStats } from '../lib/data-types';

export class CanteenStatsService {
    constructor(private firestore: Firestore) { }

    /**
     * Calcule et enregistre les statistiques pour une journée donnée.
     * @param schoolId ID de l'école
     * @param date Date au format 'yyyy-MM-dd'
     */
    async calculateDailyStats(schoolId: string, date: string): Promise<canteenDailyStats | null> {
        try {
            const reservationsRef = collection(this.firestore, `ecoles/${schoolId}/cantine_reservations`);
            const q = query(reservationsRef, where('date', '==', date));
            const querySnapshot = await getDocs(q);

            let totalRevenue = 0;
            let totalReservations = 0;
            const mealsServed: { [key: string]: number } = {
                petit_dejeuner: 0,
                dejeuner: 0,
                gouter: 0,
                diner: 0
            };

            querySnapshot.forEach((doc) => {
                const data = doc.data() as canteenReservation;
                totalReservations++;

                // On ne compte le revenu que pour les réservations payées ou servies
                if (data.paymentStatus === 'paid' || data.status === 'attended') {
                    totalRevenue += data.price || 0;
                }

                if (data.status === 'attended') {
                    mealsServed[data.mealType] = (mealsServed[data.mealType] || 0) + 1;
                }
            });

            const stats: canteenDailyStats = {
                date,
                mealsServed,
                revenue: totalRevenue,
                totalReservations,
                lastUpdated: new Date().toISOString()
            };

            const statsRef = doc(this.firestore, `ecoles/${schoolId}/cantine_stats`, date);
            await setDoc(statsRef, stats, { merge: true });

            return stats;
        } catch (error) {
            console.error("Error calculating daily stats:", error);
            return null;
        }
    }

    /**
     * Récupère les tendances pour les N derniers jours.
     */
    async getRecentStats(schoolId: string, days: number = 30): Promise<canteenDailyStats[]> {
        try {
            const statsRef = collection(this.firestore, `ecoles/${schoolId}/cantine_stats`);
            const q = query(statsRef, orderBy('date', 'desc'), limit(days));
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => doc.data() as canteenDailyStats);
        } catch (error) {
            console.error("Error fetching recent stats:", error);
            return [];
        }
    }
}
