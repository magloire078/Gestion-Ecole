import StudentIdCardClient from './StudentIdCardClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ eleveId: 'default' }];
}

export default function StudentIdCardPage() {
  return <StudentIdCardClient />;
}
