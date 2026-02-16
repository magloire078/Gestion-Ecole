import StudentReportClient from './StudentReportClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ eleveId: 'default' }];
}

export default function StudentReportPage() {
  return <StudentReportClient />;
}
