'use client';

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, User, Briefcase, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useUserSession } from "@/hooks/use-user-session";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { student as Student, staff as Staff } from '@/lib/data-types';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { NAV_LINKS } from "@/lib/nav-links";

export function SearchModal({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [queryValue, setQueryValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { schoolId } = useUserSession();
  const firestore = useFirestore();

  const studentsQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/eleves`)) : null, [schoolId, firestore]);
  const staffQuery = useMemo(() => schoolId ? query(collection(firestore, `ecoles/${schoolId}/personnel`)) : null, [schoolId, firestore]);

  const { data: studentsDocs, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: staffDocs, loading: staffLoading } = useCollection(staffQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(queryValue);
    }, 300);

    return () => clearTimeout(handler);
  }, [queryValue]);

  const { studentResults, staffResults, navigationResults } = useMemo(() => {
    if (!debouncedQuery) {
      return { studentResults: [], staffResults: [], navigationResults: [] };
    }

    const lowercasedQuery = debouncedQuery.toLowerCase();

    const studentRes = (studentsDocs || [])
      .map(doc => ({ id: doc.id, ...doc.data() } as Student & { id: string }))
      .filter(s =>
        s.firstName?.toLowerCase().includes(lowercasedQuery) ||
        s.lastName?.toLowerCase().includes(lowercasedQuery) ||
        s.matricule?.toLowerCase().includes(lowercasedQuery)
      ).slice(0, 5);

    const staffRes = (staffDocs || [])
      .map(doc => ({ id: doc.id, ...doc.data() } as Staff & { id: string }))
      .filter(s =>
        s.displayName?.toLowerCase().includes(lowercasedQuery) ||
        s.email?.toLowerCase().includes(lowercasedQuery) ||
        s.role?.toLowerCase().includes(lowercasedQuery)
      ).slice(0, 5);

    const allLinks = NAV_LINKS.flatMap(group => group.links);
    const navRes = allLinks.filter(link =>
      link.label.toLowerCase().includes(lowercasedQuery)
    ).slice(0, 5);

    return { studentResults: studentRes, staffResults: staffRes, navigationResults: navRes };

  }, [debouncedQuery, studentsDocs, staffDocs]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQueryValue('');
    }
  }, [isOpen]);

  const handleItemClick = () => {
    onClose();
  }

  const isLoading = studentsLoading || staffLoading;
  const noResults = !isLoading && debouncedQuery && studentResults.length === 0 && staffResults.length === 0 && navigationResults.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden glass-card">
        <div className="flex items-center gap-2 p-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={queryValue}
            onChange={(e) => setQueryValue(e.target.value)}
            placeholder="Rechercher élèves, personnel, pages..."
            className="border-0 shadow-none focus-visible:ring-0 h-auto p-0 text-base bg-transparent"
          />
        </div>

        <div className="max-h-[60vh] min-h-[10rem] overflow-y-auto">
          {isLoading && debouncedQuery && (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {noResults && (
            <div className="p-6 text-center text-muted-foreground">
              Aucun résultat trouvé pour &quot;{debouncedQuery}&quot;
            </div>
          )}

          {navigationResults.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">Navigation</h3>
              <div className="space-y-1">
                {navigationResults.map(link => (
                  <Link key={link.href} href={link.href} onClick={handleItemClick} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{link.label}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {studentResults.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">Élèves</h3>
              <div className="space-y-1">
                {studentResults.map(student => (
                  <Link key={student.id} href={`/dashboard/dossiers-eleves/${student.id}`} onClick={handleItemClick} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                    <Avatar className="h-8 w-8"><AvatarImage src={student.photoUrl || ''} /><AvatarFallback>{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-muted-foreground">{student.class}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {staffResults.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-2">Personnel</h3>
              <div className="space-y-1">
                {staffResults.map(member => (
                  <Link key={member.id} href={`/dashboard/rh/${member.id}`} onClick={handleItemClick} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                    <Avatar className="h-8 w-8"><AvatarImage src={member.photoURL || ''} /><AvatarFallback>{member.firstName?.[0]}{member.lastName?.[0]}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role?.replace(/_/g, ' ')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
