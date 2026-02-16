import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary" />
            <span className="text-lg font-semibold text-primary">
              Observatoire PME
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Inscription
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Observatoire de la Simplification
            <br />
            <span className="text-primary">& Performance PME</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Mesurez l&apos;impact de la complexité administrative sur votre
            entreprise. Contribuez à une base de données nationale pour
            simplifier la vie des PME françaises.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Commencer le diagnostic
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Accéder à mon espace
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10 p-2">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Diagnostic Complexité</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Évaluez votre Indice de Complexité Globale à travers un
              questionnaire couvrant les dimensions fiscale, sociale et
              administrative.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10 p-2">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Signalements</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Signalez les normes et procédures qui freinent votre activité.
              Votez pour les irritants les plus impactants.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 h-10 w-10 rounded-lg bg-primary/10 p-2">
              <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Santé du Dirigeant</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Évaluez votre bien-être et recevez des recommandations
              personnalisées pour préserver votre santé.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Observatoire de la Simplification & Performance PME</p>
          <p className="mt-1">Données conformes RGPD - Hébergement sécurisé</p>
        </div>
      </footer>
    </div>
  );
}
