'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Share, PlusSquare, MoreVertical, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
    if (typeof navigator === 'undefined') return 'other';
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'other';
}

export default function InstallPage() {
    const [platform, setPlatform] = useState<Platform>('other');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        setPlatform(detectPlatform());

        const onBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const onAppInstalled = () => setInstalled(true);

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
    };

    return (
        <main className="min-h-screen w-full flex items-center justify-center bg-[#f8faff] p-4 relative overflow-hidden font-sans">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#2D9CDB]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#0C365A]/5 blur-[120px]" />
            </div>

            <Card className="w-full max-w-md rounded-xl border-none shadow-[0_40px_100px_rgba(12,54,90,0.08)] bg-white p-2 relative z-10">
                <CardHeader className="items-center text-center space-y-4">
                    <Logo disableLink size="lg" />
                    <div>
                        <CardTitle className="text-2xl font-black text-[#0C365A] font-outfit">
                            Installer GèreEcole
                        </CardTitle>
                        <CardDescription className="mt-2">
                            Ajoutez l&apos;application à votre écran d&apos;accueil pour un accès rapide, comme une app native.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {installed && (
                        <div className="flex items-center gap-2 justify-center text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl p-3">
                            <CheckCircle2 className="h-5 w-5" />
                            Application installée !
                        </div>
                    )}

                    {platform === 'android' && !installed && (
                        <div className="space-y-4">
                            {deferredPrompt ? (
                                <Button
                                    onClick={handleInstallClick}
                                    className="w-full h-14 rounded-xl text-lg font-bold bg-[#2D9CDB] hover:bg-[#2D9CDB]/90 text-white shadow-xl shadow-blue-400/20"
                                >
                                    <Download className="mr-2 h-5 w-5" />
                                    Installer maintenant
                                </Button>
                            ) : (
                                <ol className="space-y-3 text-sm text-slate-600">
                                    <li className="flex gap-3 items-start">
                                        <span className="shrink-0 h-6 w-6 rounded-full bg-[#2D9CDB]/10 text-[#2D9CDB] font-bold text-xs flex items-center justify-center">1</span>
                                        <span>Ouvrez le menu de votre navigateur <MoreVertical className="inline h-4 w-4 mx-1" /> (généralement en haut à droite).</span>
                                    </li>
                                    <li className="flex gap-3 items-start">
                                        <span className="shrink-0 h-6 w-6 rounded-full bg-[#2D9CDB]/10 text-[#2D9CDB] font-bold text-xs flex items-center justify-center">2</span>
                                        <span>Sélectionnez <strong>&quot;Installer l&apos;application&quot;</strong> ou <strong>&quot;Ajouter à l&apos;écran d&apos;accueil&quot;</strong>.</span>
                                    </li>
                                </ol>
                            )}
                        </div>
                    )}

                    {platform === 'ios' && !installed && (
                        <ol className="space-y-3 text-sm text-slate-600">
                            <li className="flex gap-3 items-start">
                                <span className="shrink-0 h-6 w-6 rounded-full bg-[#2D9CDB]/10 text-[#2D9CDB] font-bold text-xs flex items-center justify-center">1</span>
                                <span>Ouvrez ce lien avec <strong>Safari</strong> (obligatoire sur iPhone/iPad).</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="shrink-0 h-6 w-6 rounded-full bg-[#2D9CDB]/10 text-[#2D9CDB] font-bold text-xs flex items-center justify-center">2</span>
                                <span>Appuyez sur l&apos;icône <strong>Partager</strong> <Share className="inline h-4 w-4 mx-1" /> dans la barre du bas.</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="shrink-0 h-6 w-6 rounded-full bg-[#2D9CDB]/10 text-[#2D9CDB] font-bold text-xs flex items-center justify-center">3</span>
                                <span>Choisissez <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong> <PlusSquare className="inline h-4 w-4 mx-1" />, puis <strong>&quot;Ajouter&quot;</strong>.</span>
                            </li>
                        </ol>
                    )}

                    {platform === 'other' && !installed && (
                        <p className="text-sm text-center text-slate-500">
                            Ouvrez cette page depuis le navigateur de votre téléphone (ou scannez le QR code fourni) pour installer l&apos;application sur votre écran d&apos;accueil.
                        </p>
                    )}

                    <Button asChild variant="ghost" className="w-full text-muted-foreground">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour à l&apos;accueil
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
