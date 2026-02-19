import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 text-xl font-bold text-white">
            C
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            CPME-OS
          </h1>
        </div>

        <p className="mt-4 text-lg italic text-slate-300">
          &laquo; Pas de donn&eacute;e, pas d&apos;action. Pas de rapport, pas de mandat. &raquo;
        </p>

        <p className="mt-6 text-sm text-slate-400">
          Plateforme de gestion des adh&eacute;rents, cotisations, mandats et gouvernance de la CPME.
        </p>

        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-blue-500 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Se connecter
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 text-center text-xs text-slate-500">
        &copy; CPME-OS &mdash; Syst&egrave;me de Gestion CPME
      </footer>
    </div>
  );
}
