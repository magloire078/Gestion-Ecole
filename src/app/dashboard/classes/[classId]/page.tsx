import ClassDetailsClient from './ClassClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
    return [{ classId: 'default' }];
}

export default function ClassDetailsPage() {
    return <ClassDetailsClient />;
}
