'use client';

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function MentionsLegalesPage() {
    return (
        <div className="bg-[#f8faff] min-h-screen pb-20">
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-blue-100/50">
                <div className="container h-20 flex items-center justify-between">
                    <Logo compact />
                    <Button variant="ghost" asChild>
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Retour à l'accueil
                        </Link>
                    </Button>
                </div>
            </header>

            <main className="container pt-32 max-w-4xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-4xl md:text-5xl font-black text-[#0C365A] mb-8 tracking-tight">
                        Mentions Légales
                    </h1>

                    <div className="prose prose-blue max-w-none space-y-12 text-[#1e293b]">
                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50/50">
                            <h2 className="text-2xl font-bold text-[#2D9CDB] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#2D9CDB]/10 flex items-center justify-center text-sm">1</span>
                                Éditeur du Site
                            </h2>
                            <p className="leading-relaxed">
                                Le site <strong>GéreEcole</strong> est édité par :<br />
                                <span className="block mt-2 font-semibold">Magloire KOUADIO</span>
                                <span className="block text-sm text-slate-500">Auto-entrepreneur</span>
                                <span className="block text-sm text-slate-500">[Adresse, Ville, Pays]</span>
                                <span className="block mt-4">
                                    <strong>Directeur de la publication :</strong> Magloire KOUADIO<br />
                                    <strong>Contact Email :</strong> <a href="mailto:support@gerecole.com" className="text-[#2D9CDB] hover:underline">support@gerecole.com</a>
                                </span>
                            </p>
                        </section>

                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50/50">
                            <h2 className="text-2xl font-bold text-[#2D9CDB] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#2D9CDB]/10 flex items-center justify-center text-sm">2</span>
                                Hébergement
                            </h2>
                            <p className="leading-relaxed">
                                Le site est hébergé par :<br />
                                <span className="block mt-2 font-semibold">Vercel Inc.</span>
                                <span className="block text-sm text-slate-500 text-slate-500">340 S Lemon Ave #1150 Walnut, CA 91789, USA.</span>
                                <span className="block mt-2">
                                    <strong>Site Web :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#2D9CDB] hover:underline">https://vercel.com</a>
                                </span>
                            </p>
                        </section>

                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50/50">
                            <h2 className="text-2xl font-bold text-[#2D9CDB] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#2D9CDB]/10 flex items-center justify-center text-sm">3</span>
                                Propriété Intellectuelle
                            </h2>
                            <p className="leading-relaxed">
                                L'ensemble de ce site (structure, design, logos, textes, graphismes et autres fichiers) constitue une œuvre protégée par les lois en vigueur sur la propriété intellectuelle. Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de l'éditeur.
                            </p>
                        </section>

                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50/50">
                            <h2 className="text-2xl font-bold text-[#2D9CDB] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#2D9CDB]/10 flex items-center justify-center text-sm">4</span>
                                Protection des Données Personnelles
                            </h2>
                            <div className="space-y-4">
                                <p className="leading-relaxed">
                                    Conformément aux réglementations relatives à la protection des données à caractère personnel :
                                </p>
                                <ul className="list-disc pl-6 space-y-2">
                                    <li><strong>Finalité :</strong> Les données collectées (noms, prénoms, emails, données scolaires) servent exclusivement à la gestion administrative et pédagogique des établissements utilisateurs.</li>
                                    <li><strong>Confidentialité :</strong> GéreEcole s'engage à ne jamais vendre ou louer vos données à des tiers.</li>
                                    <li><strong>Droit d'accès :</strong> Chaque utilisateur dispose d'un droit d'accès, de rectification et d'opposition aux données personnelles le concernant, en écrivant à : <strong>support@gerecole.com</strong>.</li>
                                </ul>
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50/50">
                            <h2 className="text-2xl font-bold text-[#2D9CDB] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#2D9CDB]/10 flex items-center justify-center text-sm">5</span>
                                Cookies et Traceurs
                            </h2>
                            <p className="leading-relaxed">
                                Le site utilise des cookies pour améliorer l'expérience utilisateur, réaliser des statistiques de visite (via Vercel Speed Insights) et assurer la sécurité des connexions. L'utilisateur peut configurer son navigateur pour refuser les cookies s'il le souhaite.
                            </p>
                        </section>

                        <section className="bg-white p-8 rounded-3xl shadow-sm border border-blue-50/50">
                            <h2 className="text-2xl font-bold text-[#2D9CDB] mb-6 flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-[#2D9CDB]/10 flex items-center justify-center text-sm">6</span>
                                Limitation de Responsabilité
                            </h2>
                            <p className="leading-relaxed">
                                L'éditeur ne pourra être tenu responsable des dommages directs et indirects causés au matériel de l'utilisateur, lors de l'accès au site, résultant soit de l'utilisation d'un matériel ne répondant pas aux spécifications indiquées, soit de l'apparition d'un bug ou d'une incompatibilité.
                            </p>
                        </section>
                    </div>
                </motion.div>
            </main>

            <footer className="mt-20 py-10 border-t border-blue-50 text-center text-sm text-slate-400">
                <p>© {new Date().getFullYear()} GéreEcole. Tous droits réservés.</p>
            </footer>
        </div>
    );
}
