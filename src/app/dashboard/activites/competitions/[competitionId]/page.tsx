import CompetitionParticipantsClient from './CompetitionClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ competitionId: 'default' }];
}

export default function CompetitionParticipantsPage() {
  return <CompetitionParticipantsClient />;
}
