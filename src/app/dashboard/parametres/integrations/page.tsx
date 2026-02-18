'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useSchoolData } from "@/hooks/use-school-data";
import { MessageSquare, Save, Loader2, CheckCircle, AlertCircle, Phone } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function IntegrationsPage() {
    const { toast } = useToast();
    const { schoolData, updateSchoolData } = useSchoolData();
    const [loading, setLoading] = useState(false);

    // États locaux
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [enableWhatsapp, setEnableWhatsapp] = useState(false);

    useEffect(() => {
        if (schoolData?.integrations) {
            setWhatsappNumber(schoolData.integrations.whatsappNumber || "");
            setEnableWhatsapp(schoolData.integrations.enableWhatsapp || false);
        }
    }, [schoolData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateSchoolData({
                integrations: {
                    ...schoolData?.integrations,
                    whatsappNumber,
                    enableWhatsapp
                }
            });
            toast({
                title: "✅ Configuration enregistrée",
                description: "Les paramètres d'intégration ont été mis à jour."
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "❌ Erreur",
                description: "Impossible d'enregistrer la configuration."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Intégrations & API</h3>
                <p className="text-sm text-muted-foreground">
                    Connectez votre école à des services tiers pour étendre ses fonctionnalités.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                        <CardTitle>WhatsApp Business</CardTitle>
                    </div>
                    <CardDescription>
                        Affichez un bouton "Contactez-nous sur WhatsApp" sur votre portail public et dans l'espace parents.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="enable-whatsapp"
                            checked={enableWhatsapp}
                            onCheckedChange={setEnableWhatsapp}
                        />
                        <Label htmlFor="enable-whatsapp">Activer le bouton flottant WhatsApp</Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="whatsapp-number">Numéro WhatsApp (Format International)</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="whatsapp-number"
                                placeholder="ex: 22507070707"
                                className="pl-9"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Entrez le numéro sans le '+' ni espaces. Exemple pour la Côte d'Ivoire : 22501020304
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/50 px-6 py-4">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Enregistrer
                    </Button>
                </CardFooter>
            </Card>

            <Card className="opacity-75">
                <CardHeader>
                    <CardTitle>SMS (Prochainement)</CardTitle>
                    <CardDescription>Intégration native avec les passerelles SMS locales pour les notifications de masse.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>Module en cours de développement.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
