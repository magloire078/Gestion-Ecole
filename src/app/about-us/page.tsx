import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Linkedin, Target, Heart, Sparkles, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
    title: 'À propos — GèreEcole',
    description: 'Découvrez la mission, les valeurs et l\'équipe derrière GèreEcole, la solution de gestion scolaire pensée pour les écoles d\'Afrique de l\'Ouest.',
    openGraph: {
        title: 'À propos de GèreEcole',
        description: 'Notre mission : simplifier la gestion des écoles en Afrique de l\'Ouest.',
        type: 'website',
    },
};

interface TeamMember {
    name: string;
    role: string;
    bio: string;
    photoUrl?: string;
    linkedinUrl?: string;
    email?: string;
}

// TODO: à compléter par l'équipe — photos dans /public/team/
const TEAM: TeamMember[] = [
    {
        name: 'Magloire KOUADIO',
        role: 'Fondateur & CEO',
        bio: 'Ingénieur logiciel passionné par l\'éducation, Magloire a fondé GèreEcole pour répondre aux besoins concrets des écoles d\'Afrique de l\'Ouest qu\'il connaît bien.',
        photoUrl: '/team/magloire.jpg',
        email: 'magloire078@gmail.com',
    },
    // Ajouter ici les autres membres au fur et à mesure.
];

const VALUES = [
    {
        icon: Target,
        title: 'Pragmatisme',
        text: 'Nous construisons des outils qui résolvent de vrais problèmes du quotidien — pas des fonctionnalités gadgets.',
    },
    {
        icon: Heart,
        title: 'Proximité',
        text: 'Nos équipes connaissent les réalités des écoles ivoiriennes, sénégalaises, burkinabé. Nos décisions partent du terrain.',
    },
    {
        icon: Sparkles,
        title: 'Excellence accessible',
        text: 'Une plateforme professionnelle à un prix juste, parce que chaque école mérite des outils de pointe.',
    },
];

export default function AboutUsPage() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <section className="mx-auto max-w-4xl px-6 pt-20 pb-12 text-center">
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                    Notre mission : simplifier la gestion des écoles
                    <span className="block text-primary mt-2">en Afrique de l'Ouest</span>
                </h1>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                    GèreEcole est née d'un constat simple : trop d'écoles passent encore des journées entières
                    sur des tâches administratives qui devraient être automatisées. Notre mission, c'est de
                    redonner ce temps aux directeurs, enseignants et parents — pour qu'ils se concentrent sur
                    l'essentiel : l'éducation.
                </p>
            </section>

            <section className="mx-auto max-w-5xl px-6 py-12">
                <h2 className="text-2xl md:text-3xl font-black text-center mb-10 text-slate-900">Nos valeurs</h2>
                <div className="grid gap-6 md:grid-cols-3">
                    {VALUES.map(({ icon: Icon, title, text }) => (
                        <Card key={title} className="border-slate-200">
                            <CardContent className="p-6 space-y-3">
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-lg">{title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-5xl px-6 py-16">
                <h2 className="text-2xl md:text-3xl font-black text-center mb-2 text-slate-900">L'équipe</h2>
                <p className="text-center text-slate-500 mb-10">Les visages derrière votre solution.</p>
                <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
                    {TEAM.map(member => (
                        <Card key={member.name} className="border-slate-200">
                            <CardContent className="p-6 flex gap-4 items-start">
                                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-black text-primary shrink-0">
                                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="space-y-2 min-w-0">
                                    <h3 className="font-bold text-lg leading-tight">{member.name}</h3>
                                    <p className="text-sm font-semibold text-primary">{member.role}</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">{member.bio}</p>
                                    <div className="flex gap-3 pt-1">
                                        {member.linkedinUrl && (
                                            <Link href={member.linkedinUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-primary">
                                                <Linkedin className="h-4 w-4" />
                                            </Link>
                                        )}
                                        {member.email && (
                                            <Link href={`mailto:${member.email}`} className="text-slate-400 hover:text-primary">
                                                <Mail className="h-4 w-4" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-6 py-16 text-center">
                <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-10 space-y-4">
                        <h2 className="text-2xl font-black text-slate-900">Une question ? Un projet ?</h2>
                        <p className="text-slate-600">
                            Nous serions ravis d'échanger avec vous. Réservez une démo personnalisée ou écrivez-nous directement.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <Button asChild>
                                <Link href="/contact">
                                    Demander une démo <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/faq">Consulter la FAQ</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}
