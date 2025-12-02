
'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import { Logo } from './logo';

export interface ReceiptData {
  schoolName: string;
  studentName: string;
  studentMatricule: string;
  className: string;
  date: Date;
  description: string;
  amountPaid: number;
  amountDue: number;
  payerName: string;
  payerContact?: string;
  paymentMethod?: string;
}

interface TuitionReceiptProps {
  receiptData: ReceiptData;
}

export const TuitionReceipt: React.FC<TuitionReceiptProps> = ({ receiptData }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (printContent) {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Imprimer le Reçu</title>');
            // A basic inline style for printing
            printWindow.document.write(`
                <style>
                    body { font-family: sans-serif; line-height: 1.5; color: #333; }
                    .receipt-container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .school-info h1 { font-size: 1.5rem; margin: 0; }
                    /* --- Correction pour le logo --- */
                    .logo-container svg { width: 40px !important; height: 40px !important; }
                    .receipt-info { text-align: right; }
                    .receipt-info h2 { font-size: 1.2rem; margin: 0; color: #555; }
                    .receipt-info p { margin: 0; }
                    .student-info { margin-bottom: 20px; }
                    .student-info p { margin: 2px 0; }
                    .payment-details table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    .payment-details th, .payment-details td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .payment-details th { background-color: #f2f2f2; }
                    .total { text-align: right; margin-top: 20px; font-size: 1.1rem; font-weight: bold; }
                    .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #777; }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    }
  };

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} CFA`;

  return (
    <div>
        <div ref={receiptRef} className="p-6 rounded-lg border bg-background text-sm">
            <div className="flex justify-between items-start pb-4 border-b-2 border-primary mb-6">
                <div className="flex items-center gap-2 logo-container">
                     <Logo />
                </div>
                <div className="text-right">
                    <h2 className="font-bold text-xl text-primary">REÇU DE PAIEMENT</h2>
                    <p className="text-muted-foreground">Date: {format(receiptData.date, 'd MMMM yyyy', { locale: fr })}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <h3 className="font-semibold mb-1">Reçu pour :</h3>
                    <p className="font-bold">{receiptData.studentName}</p>
                    <p className="text-muted-foreground">Matricule: {receiptData.studentMatricule}</p>
                    <p className="text-muted-foreground">Classe: {receiptData.className}</p>
                </div>
                 <div>
                    <h3 className="font-semibold mb-1">Payé par :</h3>
                    <p className="font-bold">{receiptData.payerName}</p>
                    {receiptData.payerContact && <p className="text-muted-foreground">Contact: {receiptData.payerContact}</p>}
                </div>
            </div>
            
            <div>
                <table className="w-full">
                    <thead className="bg-muted">
                        <tr>
                            <th className="p-2 text-left font-semibold">Description</th>
                            <th className="p-2 text-center font-semibold">Mode de paiement</th>
                            <th className="p-2 text-right font-semibold">Montant Payé</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-2 border-b">{receiptData.description}</td>
                            <td className="p-2 border-b text-center">{receiptData.paymentMethod}</td>
                            <td className="p-2 border-b text-right font-mono">{formatCurrency(receiptData.amountPaid)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end mt-6">
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Montant Payé:</span>
                        <span className="font-semibold">{formatCurrency(receiptData.amountPaid)}</span>
                    </div>
                     <Separator />
                    <div className="flex justify-between text-lg">
                        <span className="font-bold">Solde Restant:</span>
                        <span className="font-bold text-primary">{formatCurrency(receiptData.amountDue)}</span>
                    </div>
                </div>
            </div>
            
             <div className="mt-8 text-center text-xs text-muted-foreground">
                <p>Merci pour votre paiement.</p>
                <p>{receiptData.schoolName}</p>
            </div>
        </div>
        <div className="mt-6 flex justify-end">
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer le Reçu
            </Button>
        </div>
    </div>
  );
};
