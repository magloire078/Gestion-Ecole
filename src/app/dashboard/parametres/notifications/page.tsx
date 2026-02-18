'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Mail, MessageSquare } from 'lucide-react';
import { useSchoolData } from '@/hooks/use-school-data';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function NotificationsSettingsPage() {
    const { schoolData, schoolId } = useSchoolData();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Initial state based on schoolData or defaults
    const [settings, setSettings] = useState({
        emailAlerts: schoolData?.notificationSettings?.emailAlerts ?? true,
        smsAlerts: schoolData?.notificationSettings?.smsAlerts ?? false,
        appNotifications: schoolData?.notificationSettings?.appNotifications ?? true,
        parentDailyReport: schoolData?.notificationSettings?.parentDailyReport ?? true,
        paymentConfirmation: schoolData?.notificationSettings?.paymentConfirmation ?? true,
    });

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const schoolRef = doc(firestore, 'ecoles', schoolId);
            await updateDoc(schoolRef, {
                notificationSettings: settings
            });
            toast({ title: "Paramètres enregistrés", description: "Vos préférences de notification ont été mises à jour." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer les paramètres." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <CardHeader className="px-0">
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configurez comment et quand vous souhaitez être notifié.</CardDescription>
            </CardHeader>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4" /> Canaux de Communication
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Notifications In-App</Label>
                            <p className="text-sm text-muted-foreground">Recevoir des alertes dans l'application.</p>
                        </div>
                        <Switch checked={settings.appNotifications} onCheckedChange={() => handleToggle('appNotifications')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Alertes Email</Label>
                            <p className="text-sm text-muted-foreground">Recevoir les résumés et alertes critiques par email.</p>
                        </div>
                        <Switch checked={settings.emailAlerts} onCheckedChange={() => handleToggle('emailAlerts')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Alertes SMS (Optionnel)</Label>
                            <p className="text-sm text-muted-foreground">Nécessite des crédits SMS actifs.</p>
                        </div>
                        <Switch checked={settings.smsAlerts} onCheckedChange={() => handleToggle('smsAlerts')} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" /> Événements Automatiques
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Rapport Journalier aux Parents</Label>
                            <p className="text-sm text-muted-foreground">Envoyer un résumé des activités/absences chaque soir.</p>
                        </div>
                        <Switch checked={settings.parentDailyReport} onCheckedChange={() => handleToggle('parentDailyReport')} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Confirmation de Paiement</Label>
                            <p className="text-sm text-muted-foreground">Envoyer un reçu automatique après chaque paiement.</p>
                        </div>
                        <Switch checked={settings.paymentConfirmation} onCheckedChange={() => handleToggle('paymentConfirmation')} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Enregistrement..." : "Enregistrer les préférences"}
                </Button>
            </div>
        </div>
    );
}
