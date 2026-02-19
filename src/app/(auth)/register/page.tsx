import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-lg font-bold text-white">
              C
            </div>
            <span className="text-xl font-bold text-foreground">CPME-OS</span>
          </div>
          <CardTitle>Inscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            L&apos;inscription est g&eacute;r&eacute;e par l&apos;administrateur.
          </p>
          <p className="text-sm text-muted-foreground">
            Veuillez contacter votre administrateur CPME pour obtenir vos identifiants d&apos;acc&egrave;s.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Retour &agrave; la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
