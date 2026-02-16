import StaffProfileClient from './StaffProfileClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
    return [{ staffId: 'default' }];
}

export default function StaffProfilePage() {
    return <StaffProfileClient />;
}
