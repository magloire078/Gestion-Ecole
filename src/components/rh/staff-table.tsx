'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { staff as Staff, class_type as Class } from '@/lib/data-types';

type StaffMember = Staff & { id: string };

interface StaffTableProps {
    staff: StaffMember[];
    classes: Class[];
    onEdit: (member: StaffMember) => void;
    onDelete: (member: StaffMember) => void;
}

export const StaffTable = ({ staff, classes, onEdit, onDelete }: StaffTableProps) => {
    const router = useRouter();

    if (staff.length === 0) {
        return (
            <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                Aucun membre du personnel ne correspond aux filtres actuels.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Classe Principale</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {staff.map(member => {
                    const fullName = `${member.firstName} ${member.lastName}`;
                    const fallback = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
                    const className = classes.find(c => c.id === member.classId)?.name;

                    return (
                        <TableRow key={member.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={member.photoURL || undefined} alt={fullName} />
                                        <AvatarFallback>{fallback}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <Link href={`/dashboard/rh/${member.id}`} className="font-medium hover:underline">{fullName}</Link>
                                        <div className="text-xs text-muted-foreground">{member.email}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="capitalize">{member.role?.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{member.phone || 'N/A'}</TableCell>
                            <TableCell>{className || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/rh/${member.id}`)}>Voir Profil</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onEdit(member)}>Modifier</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(member)}>Supprimer</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    );
};
