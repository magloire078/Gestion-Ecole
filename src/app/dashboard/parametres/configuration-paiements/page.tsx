'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { CreditCard, Save, Loader2, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PaymentConfigPage() {
    const { toast } = useToast();
    const { schoolData, updateSchoolData } = useSchoolData();
    const [loading, setLoading] = useState(false);

    // États locaux
    const [cinetPayApiKey, setCinetPayApiKey] = useState("");
    const [cinetPaySecret, setCinetPaySecret] = useState("");
    const [enableOnlinePayments, setEnableOnlinePayments] = useState(false);

    useEffect(() => {
        if (schoolData?.payments) {
            setCinetPayApiKey(schoolData.payments.cinetPayApiKey || "");
            setCinetPaySecret(schoolData.payments.cinetPaySecret || "");
            setEnableOnlinePayments(schoolData.payments.enableOnlinePayments || false);
        }
    }, [schoolData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateSchoolData({
                payments: {
                    ...schoolData?.payments,
                    cinetPayApiKey,
                    cinetPaySecret,
                    enableOnlinePayments
                }
            });
            toast({
                title: "✅ Configuration de paiement mise à jour",
                description: "Vos clés API CinetPay ont été enregistrées en toute sécurité."
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "❌ Erreur",
                description: "Impossible d'enregistrer la configuration de paiement."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Configuration des Paiements</h3>
                <p className="text-sm text-muted-foreground">
                    Activez les paiements en ligne pour permettre aux parents de régler les scolarités via Mobile Money ou Carte Bancaire.
                </p>
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle>Note Importante</AlertTitle>
                <AlertDescription>
                    Les fonds collectés seront directement versés sur votre compte marchand CinetPay ou GeniusPay.
                    L'école est responsable de la gestion de ses identifiants.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-600" />
                        <CardTitle>Passerelle CinetPay / GeniusPay</CardTitle>
                    </div>
                    <CardDescription>
                        Configuration pour encaissement Mobile Money (Orange, MTN, Moov) et Carte Bancaire.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 pb-4 border-b">
                        <Switch
                            id="enable-payments"
                            checked={enableOnlinePayments}
                            onCheckedChange={setEnableOnlinePayments}
                        />
                        <Label htmlFor="enable-payments" className="font-semibold">Activer les paiements en ligne pour les parents</Label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="api-key">Clé API (API Key)</Label>
                            <Input
                                id="api-key"
                                type="password"
                                placeholder="****************"
                                value={cinetPayApiKey}
                                onChange={(e) => setCinetPayApiKey(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Fournie dans votre tableau de bord marchand.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="api-secret">Clé Secrète (Secret Key)</Label>
                            <Input
                                id="api-secret"
                                type="password"
                                placeholder="****************"
                                value={cinetPaySecret}
                                onChange={(e) => setCinetPaySecret(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Gardez cette clé confidentielle.</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-between">
                    <Button variant="ghost" onClick={() => window.open('https://cinetpay.com', '_blank')}>Créer un compte CinetPay</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Sauvegarder
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
