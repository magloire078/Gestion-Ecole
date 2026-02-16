import StaffSheetClient from './StaffSheetClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ staffId: 'default' }];
}

export default function StaffSheetPage() {
  return <StaffSheetClient />;
}
