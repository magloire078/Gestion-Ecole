import HealthRecordClient from './HealthRecordClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ eleveId: 'default' }];
}

export default function HealthRecordPage() {
  return <HealthRecordClient />;
}
