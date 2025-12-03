
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Landmark } from "lucide-react";
import Link from 'next/link';
import Image from 'next/image';
import { useSchoolData } from "@/hooks/use-school-data";
import { useToast } from "@/hooks/use-toast";

type PaymentMethod = {
    name: string;
    description: string;
    logo?: string;
    icon?: React.ReactNode;
    actionText: string;
} & ({ type: 'link'; link: string; } | { type: 'action'; onClick: () => void; });


export default function PaymentPage() {
    const { schoolName } = useSchoolData();
    const { toast } = useToast();

    const handleUnavailablePayment = (methodName: string) => {
        toast({
            title: "Bientôt disponible",
            description: `Le paiement par ${methodName} sera bientôt disponible.`,
        });
    };

    const paymentMethods: PaymentMethod[] = [
        {
            type: 'link',
            name: "Wave",
            description: "Payez facilement avec votre compte Wave.",
            link: "https://pay.wave.com/m/M_ci_2Td7SafrFP8R/c/ci/",
            logo: "data:image/jpeg;base64,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",
            actionText: "Payer avec Wave",
        },
        {
            type: 'action',
            name: "Orange Money",
            description: "Utilisez votre compte Orange Money.",
            onClick: () => handleUnavailablePayment("Orange Money"),
            logo: "https://images.seeklogo.com/logo-png/44/1/orange-money-logo-png_seeklogo-440383.png",
            actionText: "Payer avec Orange Money",
        },
        {
            type: 'action',
            name: "MTN Mobile Money",
            description: "Payez via votre portefeuille MTN.",
            onClick: () => handleUnavailablePayment("MTN Mobile Money"),
            logo: "https://www.pigroup360.com/wp-content/uploads/2020/09/mtn-mobile-money-logo.jpg",
            actionText: "Payer avec MTN MoMo",
        },
        {
            type: 'action',
            name: "Moov Money",
            description: "Utilisez votre compte Moov Money.",
            onClick: () => handleUnavailablePayment("Moov Money"),
            logo: "https://i.imgur.com/S6Hw2kZ.png",
            actionText: "Payer avec Moov Money",
        },
        {
            type: 'action',
            name: "Carte Bancaire",
            description: "Payez par Visa ou Mastercard.",
            onClick: () => handleUnavailablePayment("Carte Bancaire"),
            icon: <Landmark className="h-10 w-10 text-primary" />,
            actionText: "Payer par Carte",
        },
        {
            type: 'action',
            name: "Virement Bancaire",
            description: "Effectuez un virement direct.",
            onClick: () => handleUnavailablePayment("Virement Bancaire"),
            icon: <Landmark className="h-10 w-10 text-primary" />,
            actionText: "Infos pour Virement",
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard/settings/subscription">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-lg font-semibold md:text-2xl">Choisir un moyen de paiement</h1>
                    <p className="text-muted-foreground">
                        Passez au Plan Pro pour <strong>{schoolName}</strong> en sélectionnant une option ci-dessous.
                    </p>
                </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paymentMethods.map(method => (
                    <Card key={method.name} className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{method.name}</CardTitle>
                            <CardDescription>{method.description}</CardDescription>
                        </CardHeader>
                         <CardContent className="flex-1 flex items-center justify-center">
                            {method.logo ? (
                                <Image src={method.logo} alt={`${method.name} logo`} width={120} height={120} className="object-contain max-h-20" />
                            ) : method.icon}
                        </CardContent>
                        <CardFooter>
                            {method.type === 'link' ? (
                                <Button asChild className="w-full">
                                    <a href={method.link} target="_blank" rel="noopener noreferrer">
                                        {method.actionText}
                                    </a>
                                </Button>
                            ) : (
                                <Button className="w-full" onClick={method.onClick}>
                                    {method.actionText}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
