import StudentSheetClient from './StudentSheetClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ eleveId: 'default' }];
}

export default function StudentSheetPage() {
  return <StudentSheetClient />;
}
