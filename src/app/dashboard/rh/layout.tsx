
'use client';

import Link from "next/link";
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/firebase";

export default function RHLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    // La gestion du personnel est une fonctionnalité de base.
    // Le module payant 'rh' concernera les fonctionnalités avancées comme la paie.
    // Le blocage par abonnement est donc retiré de ce layout.
    return <>{children}</>;
}
