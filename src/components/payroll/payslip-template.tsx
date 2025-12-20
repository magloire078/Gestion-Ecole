

'use client';

import React from 'react';
import type { PayslipDetails } from '@/lib/bulletin-de-paie';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

interface PayslipTemplateProps {
  details: PayslipDetails;
}

const PayslipTemplate = React.forwardRef<HTMLDivElement, PayslipTemplateProps>(({ details }, ref) => {
    const { employeeInfo, earnings, deductions, totals, employerContributions, organizationSettings } = details;

    const formatCurrency = (value?: number) => {
        if (typeof value !== 'number') return '0';
        return value.toLocaleString('fr-FR');
    };

    return (
        <div ref={ref} className="bg-white text-black p-6 text-xs font-sans">
            <header className="flex justify-between items-start pb-4 border-b">
                <div className="flex items-center gap-4">
                    {organizationSettings.mainLogoUrl && (
                        <Image src={organizationSettings.mainLogoUrl} alt="Logo École" width={80} height={80} className="object-contain" />
                    )}
                    <div>
                        <h1 className="font-bold text-lg uppercase">{organizationSettings.name}</h1>
                        <p>{organizationSettings.address}</p>
                        <p>Tel: {organizationSettings.phone}</p>
                        <p>N° CNPS: {organizationSettings.cnpsEmployeur}</p>
                    </div>
                </div>
                <div className="text-right">
                    {organizationSettings.secondaryLogoUrl && (
                         <Image src={organizationSettings.secondaryLogoUrl} alt="Emblème National" width={60} height={60} className="object-contain ml-auto" />
                    )}
                    <p className="font-bold mt-2">BULLETIN DE PAIE</p>
                    <p>Période du 01 au {new Date(employeeInfo.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit' })} {new Date(employeeInfo.paymentDate).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</p>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-4 my-4 border-y py-2">
                 <div>
                    <p>{employeeInfo.lastName} {employeeInfo.firstName}</p>
                    <p>Catégorie: {employeeInfo.categorie}</p>
                    <p>Ancienneté: {employeeInfo.anciennete}</p>
                </div>
                <div className="text-right">
                    <p>N° Matricule: {employeeInfo.matricule}</p>
                    <p>Emploi: {employeeInfo.role}</p>
                    <p>Parts IGR: {employeeInfo.parts}</p>
                </div>
            </section>

            <main>
                <table className="w-full">
                    <thead className="border-b bg-gray-50">
                        <tr>
                            <th className="p-1 text-left font-bold uppercase">Libellé</th>
                            <th className="p-1 text-right font-bold uppercase">Base</th>
                            <th className="p-1 text-right font-bold uppercase">Taux</th>
                            <th className="p-1 text-right font-bold uppercase">A Payer</th>
                            <th className="p-1 text-right font-bold uppercase">A Retenir</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Gains */}
                        {earnings.map(e => (
                            <tr key={e.label}>
                                <td className="p-1">{e.label}</td>
                                <td className="p-1 text-right">{formatCurrency(e.amount)}</td>
                                <td className="p-1 text-right"></td>
                                <td className="p-1 text-right font-mono">{formatCurrency(e.amount)}</td>
                                <td className="p-1"></td>
                            </tr>
                        ))}
                         {totals.transportNonImposable.amount > 0 && (
                            <tr>
                               <td className="p-1">{totals.transportNonImposable.label}</td>
                               <td className="p-1"></td>
                               <td className="p-1"></td>
                               <td className="p-1 text-right font-mono">{formatCurrency(totals.transportNonImposable.amount)}</td>
                               <td className="p-1"></td>
                            </tr>
                        )}
                        <tr className="border-t">
                            <td className="p-1 font-bold">BRUT IMPOSABLE</td>
                            <td></td>
                            <td></td>
                            <td className="p-1 text-right font-bold font-mono">{formatCurrency(totals.brutImposable)}</td>
                            <td></td>
                        </tr>

                        {/* Retenues */}
                        {deductions.map(d => (
                             <tr key={d.label}>
                                <td className="p-1 pl-4">{d.label}</td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td className="p-1 text-right font-mono">{formatCurrency(d.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t-2 border-black">
                        <tr>
                            <td className="p-2 font-bold">NET A PAYER</td>
                            <td colSpan={4} className="p-2 text-right font-bold text-lg font-mono">{formatCurrency(totals.netAPayer)}</td>
                        </tr>
                    </tfoot>
                </table>
                 <p className="text-center text-xs mt-2">Arrêté le présent bulletin de paie à la somme de : <span className="font-bold">{totals.netAPayerInWords}</span></p>
                 <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <h3 className="font-bold mb-2">Paiement</h3>
                        <p>Payé le: {new Date(employeeInfo.paymentDate).toLocaleDateString('fr-FR')}</p>
                        <p>Lieu: {employeeInfo.paymentLocation}</p>
                        <p>Par: Virement</p>
                        <p>Banque: {employeeInfo.banque} - {employeeInfo.numeroCompteComplet}</p>
                    </div>
                     <div className="text-right">
                        <h3 className="font-bold mb-2">Signature de l'employé(e)</h3>
                        <div className="mt-12 w-48 border-b-2 border-dotted border-gray-400 ml-auto"></div>
                    </div>
                </div>
                 <Separator className="my-4" />

                {/* Cotisations Patronales */}
                 <div>
                    <h3 className="font-bold text-center mb-2">COTISATIONS PATRONALES</h3>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b">
                                <th className="p-1 text-left">Libellé</th>
                                <th className="p-1 text-right">Base</th>
                                <th className="p-1 text-right">Taux</th>
                                <th className="p-1 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employerContributions.map(c => c.amount > 0 && (
                                <tr key={c.label}>
                                    <td className="p-1">{c.label}</td>
                                    <td className="p-1 text-right font-mono">{formatCurrency(c.base)}</td>
                                    <td className="p-1 text-right font-mono">{c.rate}</td>
                                    <td className="p-1 text-right font-mono">{formatCurrency(c.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    );
});
PayslipTemplate.displayName = "PayslipTemplate";


export function PayslipPreview({ details }: { details: PayslipDetails }) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=1000');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Bulletin de Paie</title>');
        printWindow.document.write('<link rel="stylesheet" href="/globals.css" type="text/css" media="all">');
        printWindow.document.write(`
            <style>
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none; }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  return (
    <div>
      <div className="max-h-[60vh] overflow-y-auto bg-gray-200 p-4">
        <PayslipTemplate ref={printRef} details={details} />
      </div>
      <div className="mt-4 flex justify-end no-print">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimer le bulletin
        </Button>
      </div>
    </div>
  );
}
