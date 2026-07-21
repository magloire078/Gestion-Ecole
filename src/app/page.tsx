import { LandingPageV2 } from '@/components/landing-page-v2';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'GèreEcole - Logiciel de gestion scolaire pour l\'Afrique',
    description:
        'GèreEcole centralise la gestion de vos établissements scolaires : élèves, notes, paiements, cantine, transport et communication parents. Essai gratuit 30 jours.',
    alternates: {
        canonical: '/',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GèreEcole',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Android, iOS',
    description:
        'Logiciel de gestion scolaire SaaS pour les établissements d\'Afrique francophone. Gestion des élèves, notes, paiements, cantine, transport et RH.',
    offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'XOF',
        lowPrice: '0',
        offerCount: '3',
    },
    featureList: [
        'Gestion des dossiers élèves',
        'Notes et bulletins scolaires',
        'Suivi des paiements et frais de scolarité',
        'Gestion de la cantine scolaire',
        'Suivi du transport scolaire',
        'Communication avec les parents',
        'Gestion de l\'internat',
        'Gestion des ressources humaines',
    ],
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://gereecole.com',
};

export default function HomePage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <LandingPageV2 />
        </>
    );
}
