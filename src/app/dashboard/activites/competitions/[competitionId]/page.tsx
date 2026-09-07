import { redirect } from 'next/navigation';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ competitionId: 'default' }];
}

// Cette route a été remplacée par /dashboard/activites/competitions/details?id=...
// (seule version reliée depuis le menu, avec l'envoi d'email de résultats aux
// parents). On redirige plutôt que de maintenir deux implémentations divergentes.
export default function CompetitionParticipantsPage({ params }: { params: { competitionId: string } }) {
  redirect(`/dashboard/activites/competitions/details?id=${params.competitionId}`);
}
