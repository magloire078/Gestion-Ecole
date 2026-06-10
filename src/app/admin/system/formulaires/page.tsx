'use client';

import { Download, FileText, MousePointerClick, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FormResource {
    id: string;
    title: string;
    description: string;
    filename: string;
    sizeKb: number;
    icon: typeof FileText;
    accent: string;
    features: string[];
}

const FORMS: FormResource[] = [
    {
        id: 'interactive',
        title: 'Formulaire interactif',
        description:
            "À remplir directement dans Word. Champs cliquables, listes déroulantes, sélecteurs de date et cases à cocher.",
        filename: 'fiche-inscription-prospect-interactive.docx',
        sizeKb: 42,
        icon: MousePointerClick,
        accent: 'from-blue-500 to-cyan-500',
        features: [
            '27 champs texte cliquables',
            '11 listes déroulantes pré-remplies',
            '3 sélecteurs de date',
            '7 cases à cocher Word',
        ],
    },
    {
        id: 'printable',
        title: 'Formulaire imprimable',
        description:
            "Version papier à remplir manuellement. Mise en page propre, cases à cocher dessinées, zones de saisie sous forme de lignes.",
        filename: 'fiche-inscription-prospect-imprimable.docx',
        sizeKb: 40,
        icon: Printer,
        accent: 'from-emerald-500 to-teal-500',
        features: [
            'Optimisé impression A4',
            'Cases à cocher dessinées (☐)',
            'Pieds de signature pré-formatés',
            'Zones de notes libres',
        ],
    },
];

export default function FormulairesAdminPage() {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black tracking-tight">Formulaires d&apos;inscription</h1>
                <p className="text-sm text-muted-foreground">
                    Deux modèles à fournir aux équipes commerciales pour enregistrer un nouveau prospect/client.
                    Les deux couvrent les mêmes sections (établissement, directeur, effectifs, plan, modules,
                    facturation, paiement, signature) et restent alignés avec la grille tarifaire GèreEcole.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {FORMS.map(form => {
                    const Icon = form.icon;
                    const href = `/admin/forms/${form.filename}`;
                    return (
                        <Card key={form.id} className="overflow-hidden flex flex-col">
                            <div className={cn('h-2 bg-gradient-to-r', form.accent)} />
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div
                                        className={cn(
                                            'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md',
                                            form.accent,
                                        )}
                                    >
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <Badge variant="outline" className="font-mono text-xs">
                                        .docx · {form.sizeKb} ko
                                    </Badge>
                                </div>
                                <CardTitle className="mt-4">{form.title}</CardTitle>
                                <CardDescription>{form.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <ul className="space-y-2 text-sm">
                                    {form.features.map(feature => (
                                        <li key={feature} className="flex items-start gap-2 text-slate-600">
                                            <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2 pt-2">
                                    <Button asChild className="flex-1">
                                        <a href={href} download>
                                            <Download className="mr-2 h-4 w-4" />
                                            Télécharger
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <a href={href} target="_blank" rel="noopener noreferrer">
                                            Aperçu
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card className="bg-slate-50/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Bonnes pratiques
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• Une fois rempli, archivez le PDF du formulaire dans le dossier du prospect (Drive / GED).</p>
                    <p>• Reportez les valeurs dans GèreEcole via l&apos;écran <strong>Écoles → Nouvelle école</strong> pour démarrer le provisioning.</p>
                    <p>• Le plan choisi, les modules cochés et la fréquence de facturation conditionnent automatiquement la quote-part envoyée au commercial.</p>
                    <p>• Les deux versions sont synchronisées : si vous modifiez l&apos;une (logo, mention CGU), pensez à régénérer l&apos;autre pour qu&apos;elles restent cohérentes.</p>
                </CardContent>
            </Card>
        </div>
    );
}
