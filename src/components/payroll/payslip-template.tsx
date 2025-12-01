
"use client";

import React from 'react';
import { isValid, parseISO, lastDayOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PayslipDetails } from '@/app/bulletin-de-paie';

export function PayslipTemplate({ payslipDetails }: { payslipDetails: PayslipDetails }) {
    if (!payslipDetails) {
        return null; 
    }

    const { employeeInfo, earnings, deductions, totals, employerContributions, organizationSettings } = payslipDetails;
    
    const payslipDateObject = parseISO(payslipDetails.employeeInfo.paymentDate);
    const displayDate = {
        period: isValid(payslipDateObject) ? format(lastDayOfMonth(payslipDateObject), 'MMMM yyyy', { locale: fr }) : 'N/A',
        payment: isValid(payslipDateObject) ? format(payslipDateObject, 'EEEE d MMMM yyyy', { locale: fr }) : 'N/A'
    };

    const formatCurrency = (value: number) => {
        if (value === 0) return '0';
        return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    return (
        <div className="w-full max-w-4xl mx-auto bg-white p-4 text-black font-sans text-[10px] leading-tight print-page-break flex flex-col">
           {/* Header */}
            <header className="flex justify-between items-start pb-2 px-2 mb-2">
                <div className="flex-1 text-center flex flex-col justify-center items-center h-full">
                    <div className='font-bold text-sm leading-tight'>
                        <p className="whitespace-nowrap">{organizationSettings.name}</p>
                    </div>
                     {organizationSettings.mainLogoUrl && <img src={organizationSettings.mainLogoUrl} alt="Logo Principal" className="max-h-20 max-w-full h-auto w-auto mt-1" />}
                </div>
                
                 <div className="flex-1 text-center pt-2">
                   {/* Central content can be added here if needed in the future */}
                </div>

                <div className="flex-1 text-center flex flex-col justify-center items-center h-full">
                    <p className="font-bold text-xs whitespace-nowrap">REPUBLIQUE DE CÔTE D'IVOIRE</p>
                    {organizationSettings.secondaryLogoUrl && <img src={organizationSettings.secondaryLogoUrl} alt="Emblème national" className="max-h-[80px] max-w-full h-auto w-auto my-1" />}
                    <p className="text-xs whitespace-nowrap">Union - Discipline - Travail</p>
                </div>
            </header>

            <main>
                <div className="text-center my-2 p-1 bg-gray-200 font-bold rounded-md text-sm capitalize">
                    BULLETIN DE PAIE : Période de {displayDate.period}
                </div>

                {/* Employee Info */}
                <section className="flex">
                    <div className="w-1/3 space-y-1">
                        <p className="text-[10px]"><span className="font-bold">N° CNPS EMPLOYEUR</span>: {organizationSettings.cnpsEmployeur}</p>
                        <p className="text-[10px]"><span className="font-bold">N° CNPS EMPLOYE</span>: {employeeInfo.cnpsEmploye}</p>
                    </div>
                    <div className="w-2/3 pl-4">
                        <div className="border border-gray-400 rounded-lg p-2 text-[10px] grid grid-cols-1 gap-y-1">
                            <p><span className="font-bold inline-block w-[140px]">NOM & PRENOMS</span>: <span className="pl-1">{employeeInfo.name}</span></p>
                            <p><span className="font-bold inline-block w-[140px]">MATRICULE</span>: <span className="pl-1">{employeeInfo.matricule}</span></p>
                            <p><span className="font-bold inline-block w-[140px]">SITUATION MATRIMONIALE</span>: <span className="pl-1">{employeeInfo.situationMatrimoniale}</span></p>
                            <p><span className="font-bold inline-block w-[140px]">BANQUE</span>: <span className="pl-1">{employeeInfo.banque}</span></p>
                            <p><span className="font-bold inline-block w-[140px]">NUMERO DE COMPTE</span>: <span className="pl-1">{employeeInfo.numeroCompteComplet || employeeInfo.numeroCompte}</span></p>
                            <p><span className="font-bold inline-block w-[140px]">SERVICE</span>: <span className="pl-1">{employeeInfo.role}</span></p>
                            <p><span className="font-bold inline-block w-[140px]">DATE DE CONGE</span>: <span className="pl-1">__/__/____</span></p>
                            <p><span className="font-bold inline-block w-[140px]">ENFANT(S)</span>: <span className="pl-1">{employeeInfo.enfants}</span></p>
                        </div>
                    </div>
                </section>
                
                {/* Job Info Table */}
                <table className="w-full border-collapse border border-gray-400 rounded-lg mt-2 text-[10px] no-zebra">
                    <thead className="bg-gray-200 font-bold text-center">
                        <tr>
                            <td className="p-1 border-r border-gray-400">EMPLOI</td>
                            <td className="p-1 border-r border-gray-400">CATEGORIE</td>
                            <td className="p-1 border-r border-gray-400">ANCIENNETE</td>
                            <td className="p-1 border-r border-gray-400">NBRE DE PARTS</td>
                            <td className="p-1">DATE D'EMBAUCHE</td>
                        </tr>
                    </thead>
                    <tbody className="text-center">
                        <tr>
                            <td className="p-1 border-r border-gray-400">{employeeInfo.role}</td>
                            <td className="p-1 border-r border-gray-400">{employeeInfo.categorie}</td>
                            <td className="p-1 border-r border-gray-400">{employeeInfo.anciennete}</td>
                            <td className="p-1 border-r border-gray-400">{employeeInfo.parts}</td>
                            <td className="p-1">{employeeInfo.hireDate}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Earnings & Deductions */}
                <div className="border border-gray-400 rounded-lg mt-2 text-[10px]">
                        <table className="w-full border-collapse no-zebra">
                            <thead className="bg-gray-200 font-bold">
                                <tr>
                                    <th className="p-1 text-left w-[50%]">ELEMENTS</th>
                                    <th className="p-1 text-center w-[25%] border-l border-gray-400">GAINS</th>
                                    <th className="p-1 text-center w-[25%] border-l border-gray-400">RETENUES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {earnings.map(item => (
                                    <tr key={item.label}>
                                        <td className="pl-1 h-[21px]">{item.label}</td>
                                        <td className="pr-1 text-right font-mono border-l border-gray-400">{item.amount > 0 ? formatCurrency(item.amount) : ''}</td>
                                        <td className="pr-1 text-right font-mono border-l border-gray-400"></td>
                                    </tr>
                                ))}
                                <tr className="font-bold bg-gray-200">
                                    <td className="pl-1 h-[21px]">BRUT IMPOSABLE</td>
                                    <td className="pr-1 text-right font-mono border-l border-gray-400">{formatCurrency(totals.brutImposable)}</td>
                                    <td className="border-l border-gray-400"></td>
                                </tr>
                                {totals.transportNonImposable.amount > 0 && (
                                    <tr>
                                        <td className="pl-1 h-[21px]">{totals.transportNonImposable.label}</td>
                                        <td className="pr-1 text-right font-mono border-l border-gray-400">{formatCurrency(totals.transportNonImposable.amount)}</td>
                                        <td className="border-l border-gray-400"></td>
                                    </tr>
                                )}
                                
                                 {deductions.map(item => (
                                    <tr key={item.label}>
                                        <td className="pl-1 h-[21px]">{item.label}</td>
                                        <td className="border-l border-gray-400"></td>
                                        <td className="pr-1 text-right font-mono border-l border-gray-400">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                                <tr>
                                     <td className="pl-1 h-[21px]"><span className="font-bold">NBR JRS IMPOSABLES :</span></td>
                                     <td className="border-l border-gray-400"></td>
                                     <td className="border-l border-gray-400"></td>
                                </tr>

                            </tbody>
                        </table>
                         <div className="flex justify-between items-center font-bold bg-gray-200 border-t border-gray-400">
                            <div className="w-[50%] p-1 italic font-normal text-[8px] text-center">
                                {totals.netAPayerInWords}
                            </div>
                            <div className="w-[25%] p-1 text-left border-l border-gray-400">NET A PAYER</div>
                            <div className="w-[25%] p-1 text-right font-mono pr-1 border-l border-gray-400 text-sm">{formatCurrency(totals.netAPayer)}</div>
                        </div>
                     </div>
                
                {/* Employer Contributions */}
                <div className="grid grid-cols-12 mt-2">
                    <div className="col-span-8">
                        <p className="font-bold text-center underline mb-1 text-sm">Impôts à la charge de l'employeur</p>
                        <div className="border border-gray-400 rounded-lg p-1 text-[10px]">
                                <table className="w-full no-zebra">
                                <tbody>
                                    {employerContributions.map(item => (
                                            <tr key={item.label}>
                                            <td className="w-[45%] pr-2">{item.label}</td>
                                            <td className="w-[25%] text-right font-mono pr-2">{formatCurrency(item.base)}</td>
                                            <td className="w-[10%] text-center font-mono">{item.rate}</td>
                                            <td className="w-[20%] text-right font-mono">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                        <div className="col-span-4 flex flex-col justify-center items-center p-1">
                            <div className="text-center pb-1">
                                <p className="font-bold">Payé à {employeeInfo.paymentLocation} le</p>
                                <p className="capitalize text-xs">{displayDate.payment}</p>
                                <div className="h-20"></div>
                                <p className="border-t border-gray-400 pt-1 opacity-50">Signature</p>
                            </div>
                        </div>
                    </div>
            </main>

            {/* Footer */}
            <footer className="pt-2 mt-auto">
                <div className="leading-tight text-center border-t border-gray-400 pt-1">
                    <p className="font-bold">{organizationSettings.name}</p>
                    <p>{organizationSettings.address}</p>
                    <p>
                        {organizationSettings.phone && <span>Tél: {organizationSettings.phone}</span>}
                        {organizationSettings.website && <span> | Site: {organizationSettings.website}</span>}
                    </p>
                </div>
            </footer>
        </div>
    );
}
