import StudentTimetableClient from './StudentTimetableClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ eleveId: 'default' }];
}

export default function StudentTimetablePage() {
  return <StudentTimetableClient />;
}
