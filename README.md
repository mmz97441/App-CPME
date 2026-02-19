# CPME-OS | Système de Gestion CPME

> *"Pas de donnée, pas d'action. Pas de rapport, pas de mandat."*

Plateforme de gestion intégrée pour la CPME : adhérents, cotisations, gouvernance, mandats et communication.

## Stack Technique

- **Frontend** : Next.js 14 (App Router), TypeScript, TailwindCSS, Radix UI
- **Backend** : API Routes Next.js, Prisma ORM, Zod validation
- **Base de données** : PostgreSQL (Supabase)
- **Authentification** : NextAuth.js (email/mot de passe)
- **Déploiement** : Vercel

## Modules

### Phase 1 - Adhérents & Cotisations (MVP)
- **CRM Adhérents** : Fiche 360°, SIRET, effectif, CA, secteur, tagging VIP
- **Cotisations** : Barème par effectif, génération automatique des appels, Kill Switch
- **Liste Électorale** : Vue filtrée des adhérents éligibles au vote
- **Dashboard** : Vue temps réel pour Président et Trésorier

### Phase 2 - Gouvernance & Mandats (Avril 2026)
- Convocations automatisées, émargement hybride, vote anonyme sécurisé
- Cartographie des mandats, candidatures, reporting obligatoire

### Phase 3 - Innovations (Juin 2026)
- Matching Fund, Passeport Entrepreneur, Ticketing

## Rôles (RBAC)

| Rôle | Accès |
|------|-------|
| ADMIN | Administration système complète |
| PRESIDENT | Accès total, levée de suspension |
| DELEGUE_GENERAL | Gestion adhérents, mandats, tickets |
| TRESORIER | Cotisations, trésorerie |
| MEMBRE_BUREAU | Gouvernance, votes, validation |
| MEMBRE_CA | Participation CA, votes |
| ADHERENT | Espace membre |

## Installation

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@cpme.re | Admin123! |
| Président | president@cpme.re | President123! |
| Délégué Général | dg@cpme.re | Delegue123! |
| Trésorier | tresorier@cpme.re | Tresorier123! |
| Adhérent | demo@entreprise.re | Adherent123! |

## Barème des Cotisations

| Tranche | Montant |
|---------|---------|
| Auto-entrepreneur (0) | 150 € |
| TPE (1-5) | 250 € |
| TPE (6-10) | 500 € |
| PME (11-50) | 1 000 € |
| PME (51-200) | 2 000 € |
| ETI (201-500) | 3 500 € |
| ETI/GE (500+) | 5 000 € |

## Variables d'Environnement

| Variable | Description |
|----------|-------------|
| DATABASE_URL | URL PostgreSQL (Supabase pooler) |
| DIRECT_URL | URL PostgreSQL directe (migrations) |
| NEXT_PUBLIC_SUPABASE_URL | URL Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Clé publique Supabase |
| NEXTAUTH_URL | URL de l'application |
| NEXTAUTH_SECRET | Secret JWT |
