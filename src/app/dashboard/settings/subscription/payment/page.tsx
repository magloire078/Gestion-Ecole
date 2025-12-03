
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Landmark } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { useSchoolData } from "@/hooks/use-school-data";

const paymentMethods = [
    {
        name: "Wave",
        description: "Payez facilement avec votre compte Wave.",
        logo: "https://i.ibb.co/3sfnCj8/wave-logo.png",
        link: "https://pay.wave.com/m/M_ci_2Td7SafrFP8R/c/ci/",
        actionText: "Payer avec Wave"
    },
    {
        name: "Orange Money",
        description: "Utilisez Orange Money pour un paiement rapide.",
        logo: "https://i.ibb.co/6yqGvY9/Orange-Money-logo-2016-svg.png",
        link: "#", // Replace with actual Orange Money link
        actionText: "Payer avec Orange Money"
    },
    {
        name: "MTN Mobile Money",
        description: "Payez en toute sécurité avec MTN MoMo.",
        logo: "https://i.ibb.co/m9LCR7x/mtn-momo.png",
        link: "#", // Replace with actual MTN MoMo link
        actionText: "Payer avec MTN MoMo"
    },
    {
        name: "Virement Bancaire",
        description: "Contactez-nous pour les détails du virement.",
        icon: <Landmark className="h-10 w-10 text-primary" />,
        link: "mailto:support@gereecole.com", // Replace with your support email
        actionText: "Demander les instructions"
    }
];

export default function PaymentPage() {
    const { schoolName } = useSchoolData();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard/settings/subscription">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Retour</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Mettre à niveau vers le Plan Pro</h1>
                    <p className="text-muted-foreground">
                        Choisissez votre moyen de paiement pour l'abonnement de <strong>{schoolName || 'votre école'}</strong>.
                    </p>
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {paymentMethods.map((method) => (
                    <Card key={method.name} className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{method.name}</CardTitle>
                            <CardDescription>{method.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center">
                            {method.logo ? (
                                <div className="relative h-20 w-40">
                                    <Image
                                        src={method.logo}
                                        alt={`${method.name} logo`}
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        data-ai-hint={`${method.name} logo`}
                                    />
                                </div>
                            ) : (
                                method.icon
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={method.link} target={method.link.startsWith('http') ? "_blank" : "_self"} rel={method.link.startsWith('http') ? "noopener noreferrer" : ""}>
                                    {method.actionText}
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Card className="bg-muted/50">
                 <CardHeader>
                    <CardTitle>Après votre paiement</CardTitle>
                    <CardDescription>
                        Une fois votre paiement effectué, veuillez nous envoyer une preuve à <a href="mailto:contact@gereecole.com" className="text-primary underline">contact@gereecole.com</a>. Votre abonnement Pro sera activé dans les plus brefs délais.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
