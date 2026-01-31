'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Edit, Trash2, Mail, Phone, BookUser, FileText, Eye } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { staff as Staff, class_type as Class } from '@/lib/data-types';
import { useRouter } from 'next/navigation';

type StaffMember = Staff & { id: string };

interface StaffCardProps {
    member: StaffMember;
    className?: string;
    onEdit: (member: StaffMember) => void;
    onDelete: (member: StaffMember) => void;
}

const StaffCard = ({ member, className, onEdit, onDelete }: StaffCardProps) => {
    const router = useRouter();
    const fullName = `${member.firstName} ${member.lastName}`;
    const fallback = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();

    return (
        <Card className="flex flex-col">
          <Link href={`/dashboard/rh/${member.id}`} className="flex-1 flex flex-col hover:bg-accent/50 rounded-t-xl transition-colors">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={member.photoURL || undefined} alt={fullName} />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{fullName}</CardTitle>
                            <CardDescription className="capitalize">{member.role?.replace(/_/g, ' ')}</CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                    <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4" />
                        <span className="truncate">{member.phone}</span>
                    </div>
                )}
                {className && (
                     <div className="flex items-center">
                        <BookUser className="mr-2 h-4 w-4" />
                        <span>Classe principale: <strong>{className}</strong></span>
                    </div>
                )}
            </CardContent>
          </Link>
           <CardFooter className="pt-4 border-t">
              <div className="flex w-full items-center justify-between">
                  <Button asChild size="sm">
                      <Link href={`/dashboard/rh/${member.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir Profil
                      </Link>
                  </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(member)}><Edit className="mr-2 h-4 w-4"/>Modifier</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/rh/${member.id}/fiche`)}><FileText className="mr-2 h-4 w-4" />Imprimer Fiche</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(member)}>
                            <Trash2 className="mr-2 h-4 w-4" />Supprimer
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
            </CardFooter>
        </Card>
    );
};

interface StaffGridProps {
  staff: StaffMember[];
  classes: Class[];
  onEdit: (member: StaffMember) => void;
  onDelete: (member: StaffMember) => void;
}

export const StaffGrid = ({ staff, classes, onEdit, onDelete }: StaffGridProps) => {
    if (staff.length === 0) {
        return (
             <Card className="flex items-center justify-center h-48">
                <p className="text-muted-foreground">Aucun membre du personnel ne correspond aux filtres actuels.</p>
            </Card>
        );
    }
    
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {staff.map(member => {
                const className = classes.find(c => c.id === member.classId)?.name;
                return <StaffCard key={member.id} member={member} className={className} onEdit={onEdit} onDelete={onDelete} />;
            })}
        </div>
    );
}
