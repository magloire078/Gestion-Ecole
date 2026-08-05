import StudentProfileClient from './StudentProfileClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ eleveId: 'default' }];
}

export default function StudentProfilePage() {
  return <StudentProfileClient />;
}
