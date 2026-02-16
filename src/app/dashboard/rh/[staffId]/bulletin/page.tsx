import StaffPayslipClient from './StaffPayslipClient';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ staffId: 'default' }];
}

export default function StaffPayslipPage() {
  return <StaffPayslipClient />;
}
