import ParentStudentClient from './ParentStudentClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
    return [{ studentId: 'default' }];
}

export default function ParentStudentPage() {
    return <ParentStudentClient />;
}
