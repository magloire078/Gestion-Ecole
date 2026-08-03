import type { Metadata } from 'next';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, MessageCircle } from 'lucide-react';

export const metadata: Metadata = {
    title: 'FAQ — GèreEcole',
    description: 'Toutes les réponses aux questions fréquentes sur GèreEcole : tarifs, fonctionnalités, sécurité, support, et démarrage.',
    openGraph: {
        title: 'Questions fréquentes — GèreEcole',
        description: 'Tarifs, sécurité, fonctionnalités, démarrage : retrouvez toutes les réponses.',
        type: 'website',
    },
};

interface FaqItem {
    q: string;
    a: string;
}

interface FaqCategory {
    title: string;
    items: FaqItem[];
}

const FAQ: FaqCategory[] = [
    {
        title: 'Tarifs & abonnement',
        items: [
            {
                q: 'Comment fonctionne la facturation par élève ?',
                a: 'Les plans Pro et Premium sont facturés par élève actif chaque mois (250 FCFA/élève pour Pro, 500 FCFA/élève pour Premium). Vous ne payez que pour ce que vous utilisez — un élève marqué inactif n\'est pas facturé.',
            },
            {
                q: 'Le plan Essentiel est-il vraiment gratuit ?',
                a: 'Oui, sans limite de durée. Il couvre jusqu\'à 50 élèves et 5 cycles, ce qui suffit largement à de petites structures. Aucune carte bancaire n\'est demandée à l\'inscription.',
            },
            {
                q: 'Puis-je changer de plan en cours d\'année ?',
                a: 'Oui, vous pouvez passer à un plan supérieur à tout moment depuis Paramètres → Abonnement. Le downgrade est possible mais bloqué si votre effectif dépasse la limite du plan visé.',
            },
            {
                q: 'Quels moyens de paiement acceptez-vous ?',
                a: 'Orange Money, Wave, MTN Mobile Money, PayDunya, Genius Pay, et carte bancaire (Visa, Mastercard) via Stripe. Vous pouvez payer pour 1, 3 ou 12 mois en une fois.',
            },
            {
                q: 'Que se passe-t-il si je n\'arrive pas à payer à temps ?',
                a: 'Vous bénéficiez d\'une période de grâce de 7 jours après l\'échéance pour régulariser, sans perdre l\'accès. Au-delà, votre compte passe en mode « expiré » et certaines fonctionnalités sont restreintes — vos données ne sont jamais supprimées.',
            },
        ],
    },
    {
        title: 'Démarrage & migration',
        items: [
            {
                q: 'Combien de temps pour démarrer ?',
                a: 'Une école peut être opérationnelle en moins de 30 minutes : création du compte, ajout des cycles/classes, et import en masse de la liste d\'élèves depuis Excel ou CSV.',
            },
            {
                q: 'Puis-je importer mes données depuis un ancien logiciel ?',
                a: 'Oui. GèreEcole accepte les fichiers Excel, CSV, JSON et même les dumps SQL (phpMyAdmin, mysqldump, pg_dump). Notre équipe peut faire l\'import pour vous si besoin — contactez le support.',
            },
            {
                q: 'Y a-t-il une formation pour mon équipe ?',
                a: 'Oui. Tous les plans incluent un accompagnement au démarrage. Les plans Pro et Premium bénéficient d\'une session de formation dédiée pour votre équipe (en visio ou en présentiel selon votre localisation).',
            },
        ],
    },
    {
        title: 'Sécurité & données',
        items: [
            {
                q: 'Où sont stockées les données de mon école ?',
                a: 'Sur l\'infrastructure Google Firebase, dans des datacenters européens conformes au RGPD. Les sauvegardes sont automatiques et chiffrées.',
            },
            {
                q: 'Qui peut accéder aux données ?',
                a: 'Uniquement les utilisateurs que vous autorisez (directeur, personnel administratif, enseignants, parents). Chaque accès est filtré par rôle et permission, et tracé dans un journal d\'audit.',
            },
            {
                q: 'Puis-je exporter mes données à tout moment ?',
                a: 'Oui. Toutes vos données sont exportables en Excel/CSV à tout moment depuis Paramètres → Données. En cas de résiliation, vous gardez 90 jours pour exporter vos données.',
            },
        ],
    },
    {
        title: 'Fonctionnalités',
        items: [
            {
                q: 'GèreEcole gère-t-il les bulletins ?',
                a: 'Oui. Saisie des notes par enseignant, calcul automatique des moyennes par matière, par trimestre et annuelles, génération de bulletins PDF avec le logo de votre établissement.',
            },
            {
                q: 'Y a-t-il une application pour les parents ?',
                a: 'Oui. Les parents disposent d\'un portail dédié pour suivre les notes, l\'assiduité, les paiements et communiquer avec l\'école. Une app mobile Android/iOS est en cours de finalisation.',
            },
            {
                q: 'Puis-je gérer la cantine et le transport scolaire ?',
                a: 'Oui, via des modules complémentaires activables (10 000 FCFA/mois chacun, inclus dans le plan Premium). Inscription, facturation et suivi des présences sont gérés directement dans la plateforme.',
            },
        ],
    },
];

export default function FaqPage() {
    const allItems = FAQ.flatMap(cat => cat.items);

    // Schema.org FAQPage pour le SEO Google.
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: allItems.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.a,
            },
        })),
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <section className="mx-auto max-w-3xl px-6 pt-20 pb-12 text-center">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                    Questions fréquentes
                </h1>
                <p className="mt-6 text-lg text-slate-600">
                    Tout ce qu'il faut savoir avant de démarrer. Une autre question ?{' '}
                    <Link href="/contact" className="text-primary font-semibold underline">
                        Écrivez-nous
                    </Link>.
                </p>
            </section>

            <section className="mx-auto max-w-3xl px-6 pb-16 space-y-10">
                {FAQ.map(cat => (
                    <div key={cat.title}>
                        <h2 className="text-xl font-black mb-4 text-slate-900">{cat.title}</h2>
                        <Accordion type="single" collapsible className="space-y-2">
                            {cat.items.map((item, idx) => (
                                <AccordionItem
                                    key={idx}
                                    value={`${cat.title}-${idx}`}
                                    className="border rounded-xl bg-white px-4"
                                >
                                    <AccordionTrigger className="text-left font-semibold hover:no-underline">
                                        {item.q}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-slate-600 leading-relaxed">
                                        {item.a}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                ))}
            </section>

            <section className="mx-auto max-w-3xl px-6 pb-20">
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-8 text-center space-y-4">
                        <MessageCircle className="h-10 w-10 mx-auto text-primary" />
                        <h2 className="text-2xl font-black text-slate-900">Pas trouvé votre réponse ?</h2>
                        <p className="text-slate-600">
                            Notre équipe répond sous 24h ouvrées. Vous pouvez aussi réserver une démo personnalisée.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild>
                                <Link href="/contact">
                                    Nous contacter <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/about-us">En savoir plus sur nous</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
