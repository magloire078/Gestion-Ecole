import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    increment,
    getDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase';
import type { canteenInventoryItem as StockItem, canteenInventoryLog as StockLog } from '@/lib/data-types';
import { NotificationService } from './notification-service';

export const StockService = {
    /**
     * Récupère la référence de la collection de stocks pour une école
     */
    getCollectionRef: (schoolId: string) => collection(db, `ecoles/${schoolId}/stocks`),

    /**
     * Récupère la référence de la collection de logs de stocks
     */
    getLogsCollectionRef: (schoolId: string) => collection(db, `ecoles/${schoolId}/stock_logs`),

    /**
     * Ajoute un nouvel article au stock
     */
    addItem: async (schoolId: string, item: Omit<StockItem, 'id' | 'lastUpdated'>) => {
        const docRef = await addDoc(StockService.getCollectionRef(schoolId), {
            ...item,
            lastUpdated: new Date().toISOString()
        });
        return docRef.id;
    },

    /**
     * Met à jour un article existant
     */
    updateItem: async (schoolId: string, itemId: string, updates: Partial<StockItem>) => {
        const docRef = doc(db, `ecoles/${schoolId}/stocks`, itemId);
        await updateDoc(docRef, {
            ...updates,
            lastUpdated: new Date().toISOString()
        });
    },

    /**
     * Enregistre un mouvement de stock (entrée/sortie)
     */
    logMovement: async (
        schoolId: string,
        itemId: string,
        moveIndex: {
            type: 'in' | 'out',
            quantity: number,
            reason: string,
            staffId: string,
            notes?: string
        }
    ) => {
        const itemRef = doc(db, `ecoles/${schoolId}/stocks`, itemId);
        const itemSnap = await getDoc(itemRef);

        if (!itemSnap.exists()) throw new Error("Article non trouvé");
        const itemData = itemSnap.data() as StockItem;

        // Calcul de la nouvelle quantité
        const quantityChange = moveIndex.type === 'in' ? moveIndex.quantity : -moveIndex.quantity;
        const newQuantity = itemData.quantity + quantityChange;

        if (newQuantity < 0) throw new Error("Quantité insuffisante en stock");

        // 1. Mettre à jour la quantité de l'article
        await updateDoc(itemRef, {
            quantity: increment(quantityChange),
            lastUpdated: new Date().toISOString()
        });

        // 2. Créer le log de mouvement
        await addDoc(StockService.getLogsCollectionRef(schoolId), {
            itemId,
            itemName: itemData.name,
            ...moveIndex,
            timestamp: new Date().toISOString()
        });

        // 3. Vérifier le seuil critique pour notification
        if (newQuantity <= itemData.minThreshold) {
            await NotificationService.sendNotification(db, schoolId, "broadcast_staff", {
                title: "Alerte Stock Critique",
                content: `L'article "${itemData.name}" est passé sous le seuil critique (${newQuantity} ${itemData.unit} restants).`,
                href: "/dashboard/stocks"
            });
        }

        return newQuantity;
    },

    /**
     * Supprime un article
     */
    deleteItem: async (schoolId: string, itemId: string) => {
        const docRef = doc(db, `ecoles/${schoolId}/stocks`, itemId);
        await deleteDoc(docRef);
    }
};
