'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/currency-utils';
import type { student as Student } from '@/lib/data-types';

type StatusMode = 'simple' | 'periode' | 'dates';

interface Echeance {
  label: string;
  date: string; // yyyy-mm-dd
  percent: number; // % cumulé attendu à cette date
}

// Échéancier par défaut (modifiable en mode « dates »). Cumulatif.
const DEFAULT_ECHEANCES: Echeance[] = [
  { label: 'Inscription', date: '', percent: 25 },
  { label: '1er versement', date: '', percent: 50 },
  { label: '2e versement', date: '', percent: 75 },
  { label: '3e versement', date: '', percent: 100 },
];

const EPS = 1; // tolérance de 1 F pour les arrondis

function statutFor(paid: number, total: number, expectedByNow: number, mode: StatusMode) {
  if (total <= 0) return { label: 'N/A', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
  const solde = paid >= total - EPS;
  if (mode === 'simple') {
    return solde
      ? { label: 'SOLDÉ', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
      : { label: 'RESTE DÛ', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
  }
  // périodes / dates : comparaison au montant attendu à ce jour
  if (solde) return { label: 'SOLDÉ', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
  if (paid > expectedByNow + EPS) return { label: 'EN AVANCE', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' };
  if (paid >= expectedByNow - EPS) return { label: 'À JOUR', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
  return { label: 'RETARD', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' };
}

export function PointFinancierClasse({ students }: { students: Student[] }) {
  const [mode, setMode] = useState<StatusMode>('simple');
  // Mode « périodes »
  const [periode, setPeriode] = useState(1);
  const [totalPeriodes, setTotalPeriodes] = useState(4);
  // Mode « dates »
  const [echeances, setEcheances] = useState<Echeance[]>(DEFAULT_ECHEANCES);

  // Classes distinctes présentes chez les élèves.
  const classes = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.class) set.add(s.class); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);

  const [selectedClass, setSelectedClass] = useState<string>('__all__');

  // Fraction attendue à ce jour selon le mode.
  const expectedFraction = useMemo(() => {
    if (mode === 'periode') {
      const t = totalPeriodes > 0 ? totalPeriodes : 1;
      return Math.min(Math.max(periode / t, 0), 1);
    }
    if (mode === 'dates') {
      const today = new Date().toISOString().split('T')[0];
      const due = echeances
        .filter(e => e.date && e.date <= today)
        .reduce((max, e) => Math.max(max, e.percent), 0);
      return Math.min(Math.max(due / 100, 0), 1);
    }
    return 0; // simple : non utilisé
  }, [mode, periode, totalPeriodes, echeances]);

  const rows = useMemo(() => {
    const filtered = students
      .filter(s => selectedClass === '__all__' || s.class === selectedClass)
      .sort((a, b) => `${a.lastName ?? ''} ${a.firstName ?? ''}`.localeCompare(`${b.lastName ?? ''} ${b.firstName ?? ''}`, 'fr'));
    return filtered.map((s, i) => {
      const total = s.tuitionFee || 0;
      const reste = s.amountDue || 0;
      const paid = Math.max(total - reste, 0);
      const expectedByNow = total * expectedFraction;
      return {
        n: i + 1,
        id: s.id,
        nom: `${s.lastName ?? ''} ${s.firstName ?? ''}`.trim() || 'Sans nom',
        classe: s.class || '—',
        total,
        paid,
        reste,
        statut: statutFor(paid, total, expectedByNow, mode),
      };
    });
  }, [students, selectedClass, expectedFraction, mode]);

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({ total: acc.total + r.total, paid: acc.paid + r.paid, reste: acc.reste + r.reste }),
    { total: 0, paid: 0, reste: 0 },
  ), [rows]);

  const scopeLabel = selectedClass === '__all__' ? 'Toutes les classes' : selectedClass;

  const handleExportCSV = () => {
    const header = ['N°', 'Nom & Prénoms', 'Classe', 'Scolarité totale', 'Versé', 'Reste', 'Statut'];
    const lines = rows.map(r => [r.n, r.nom, r.classe, r.total, r.paid, r.reste, r.statut.label]);
    lines.push(['', 'TOTAL', '', totals.total, totals.paid, totals.reste, '']);
    const csv = [header, ...lines]
      .map(row => row.map(cell => {
        const v = String(cell ?? '');
        return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(';'))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `point-financier-${scopeLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classe</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[220px] rounded-xl h-11 font-bold">
              <SelectValue placeholder="Choisir une classe" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="__all__">Toutes les classes</SelectItem>
              {classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mode de statut</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as StatusMode)}>
            <SelectTrigger className="w-[240px] rounded-xl h-11 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="simple">Simple (soldé / reste dû)</SelectItem>
              <SelectItem value="periode">Par période (avance/à jour/retard)</SelectItem>
              <SelectItem value="dates">Par dates d&apos;échéance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={rows.length === 0}
            className="rounded-xl border-slate-200 dark:border-slate-700 gap-2 font-bold h-11">
            <FileDown className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => window.print()} disabled={rows.length === 0}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold h-11">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
        </div>
      </div>

      {/* Paramètres du mode période */}
      {mode === 'periode' && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Période courante</Label>
            <Input type="number" min={0} max={totalPeriodes} value={periode}
              onChange={(e) => setPeriode(Number(e.target.value))} className="w-28 rounded-xl h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre de versements</Label>
            <Input type="number" min={1} max={12} value={totalPeriodes}
              onChange={(e) => setTotalPeriodes(Number(e.target.value))} className="w-28 rounded-xl h-10" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pb-2">
            Attendu à ce jour : <b>{Math.round(expectedFraction * 100)}%</b> de la scolarité.
          </p>
        </div>
      )}

      {/* Paramètres du mode dates */}
      {mode === 'dates' && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Échéancier (% cumulé attendu à chaque date)</p>
          <div className="flex flex-wrap gap-3">
            {echeances.map((e, idx) => (
              <div key={idx} className="flex items-end gap-1.5">
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-slate-400">{e.label}</Label>
                  <Input type="date" value={e.date}
                    onChange={(ev) => setEcheances(prev => prev.map((x, i) => i === idx ? { ...x, date: ev.target.value } : x))}
                    className="w-40 rounded-lg h-9 text-xs" />
                </div>
                <Input type="number" min={0} max={100} value={e.percent}
                  onChange={(ev) => setEcheances(prev => prev.map((x, i) => i === idx ? { ...x, percent: Number(ev.target.value) } : x))}
                  className="w-16 rounded-lg h-9 text-xs" />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Attendu à ce jour : <b>{Math.round(expectedFraction * 100)}%</b> de la scolarité (selon les dates déjà passées).
          </p>
        </div>
      )}

      {/* Tableau */}
      <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-800/50 border-b">
              <TableRow>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400 w-12">N°</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Nom &amp; Prénoms</TableHead>
                {selectedClass === '__all__' && <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Classe</TableHead>}
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400 text-right">Scolarité totale</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400 text-right">Versé</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400 text-right">Reste</TableHead>
                <TableHead className="text-xs font-black uppercase tracking-widest text-slate-400">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">Aucun élève pour cette sélection.</TableCell>
                </TableRow>
              ) : rows.map(r => (
                <TableRow key={r.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                  <TableCell className="font-mono text-xs font-bold text-slate-500">{r.n}</TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-white">{r.nom}</TableCell>
                  {selectedClass === '__all__' && <TableCell className="font-medium text-slate-600 dark:text-slate-300">{r.classe}</TableCell>}
                  <TableCell className="font-mono text-right text-slate-700 dark:text-slate-200">{formatCurrency(r.total)}</TableCell>
                  <TableCell className="font-mono text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(r.paid)}</TableCell>
                  <TableCell className="font-mono text-right font-bold text-rose-600 dark:text-rose-400">{formatCurrency(r.reste)}</TableCell>
                  <TableCell><span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-black ${r.statut.cls}`}>{r.statut.label}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
            {rows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50">
                <TableRow>
                  <TableCell className="font-black text-slate-700 dark:text-slate-200" colSpan={selectedClass === '__all__' ? 3 : 2}>TOTAL — {scopeLabel} ({rows.length})</TableCell>
                  <TableCell className="font-mono text-right font-black text-slate-900 dark:text-white">{formatCurrency(totals.total)}</TableCell>
                  <TableCell className="font-mono text-right font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totals.paid)}</TableCell>
                  <TableCell className="font-mono text-right font-black text-rose-700 dark:text-rose-400">{formatCurrency(totals.reste)}</TableCell>
                  <TableCell />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
