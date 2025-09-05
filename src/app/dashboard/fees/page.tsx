import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mockFeeData } from "@/lib/data";
import { Euro } from "lucide-react";

export default function FeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Frais de Scolarité</h1>
        <p className="text-muted-foreground">Aperçu des frais de scolarité et des calendriers de paiement.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockFeeData.map((fee) => (
          <Card key={fee.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{fee.grade}</CardTitle>
              <Euro className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{fee.amount}</div>
              <p className="text-xs text-muted-foreground pt-2">{fee.details}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
