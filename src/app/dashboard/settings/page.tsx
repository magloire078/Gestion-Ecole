import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre école.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Les informations de votre profil.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Section des paramètres en construction.</p>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>École</CardTitle>
          <CardDescription>Détails de votre établissement.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Section des paramètres en construction.</p>
        </CardContent>
      </Card>
    </div>
  );
}
