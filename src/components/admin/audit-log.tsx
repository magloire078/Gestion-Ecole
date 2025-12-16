'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

export const AuditLog = ({ limit }: { limit: number }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
            <TableBody>
                <TableRow>
                    <TableCell>
                        <p className="text-sm text-muted-foreground text-center py-4">Le journal d'audit est en cours de développement.</p>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

    