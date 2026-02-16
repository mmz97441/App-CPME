# Observatoire de la Simplification & Performance PME

Application SaaS B2B data-driven pour mesurer et analyser l'impact de la complexité administrative sur la performance des PME françaises.

## Stack Technique

- **Frontend** : Next.js 14 (App Router), TypeScript, TailwindCSS, Radix UI
- **Backend** : API REST Next.js, Prisma ORM, Zod validation
- **Base de données** : PostgreSQL
- **Authentification** : NextAuth.js avec JWT
- **Charts** : Recharts
- **PDF** : jsPDF + jsPDF-AutoTable
- **IA** : OpenAI API (classification, résumé, détection doublons)
- **Tests** : Vitest

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Pages authentification (login, register)
│   ├── (dashboard)/        # Pages protégées
│   │   ├── dashboard/      # Tableau de bord entrepreneur
│   │   ├── diagnostic/     # Module diagnostic complexité
│   │   ├── signalements/   # Module signalements normatifs
│   │   ├── observatory/    # Observatoire data analytics
│   │   ├── health/         # Santé du dirigeant
│   │   └── admin/          # Administration
│   └── api/                # API Routes
│       ├── auth/           # Authentification
│       ├── diagnostics/    # CRUD diagnostics
│       ├── signalements/   # CRUD signalements + votes
│       ├── health-assessments/  # Évaluations santé
│       ├── observatory/    # Données agrégées
│       ├── ai/             # Services IA
│       ├── export/         # Export PDF
│       └── users/          # Gestion profil + suppression RGPD
├── components/             # Composants React
│   ├── ui/                 # Design system (Button, Card, Input, etc.)
│   ├── layout/             # Sidebar, navigation
│   ├── dashboard/          # Dashboard entrepreneur
│   ├── diagnostic/         # Formulaire diagnostic
│   ├── signalements/       # Formulaire + liste signalements
│   ├── observatory/        # Dashboard analytique
│   └── health/             # Formulaire santé
├── lib/                    # Configuration (Prisma, Auth, Rate limit)
├── middleware/              # GDPR middleware
├── services/               # AI service, PDF service
├── types/                  # Types TypeScript + RBAC
├── utils/                  # Scoring algorithms, validation Zod
└── tests/                  # Tests unitaires
```

## Modules

### 1. Diagnostic Complexité PME
Questionnaire dynamique en 4 étapes évaluant la complexité fiscale, sociale et administrative. Calcul de l'ICG (Indice de Complexité Globale) normalisé sur 100.

### 2. Signalement Normatif
Système de signalement avec vote communautaire. Score de gravité recalculé dynamiquement.

### 3. Observatoire Data
Dashboard analytique avec heatmap régionale, top 10 irritants, évolution trimestrielle et vue radar sectorielle.

### 4. Santé du Dirigeant
Questionnaire confidentiel avec alertes automatiques et recommandations personnalisées.

### 5. Intelligence Artificielle
Classification automatique des signalements, résumé, détection de doublons, génération de notes de synthèse parlementaire.

## Rôles Utilisateurs (RBAC)

| Rôle | Accès |
|------|-------|
| ENTREPRENEUR | Diagnostic, Signalements, Santé, Dashboard |
| ADMIN | Accès complet + Administration |
| ANALYSTE | Lecture données + Observatoire + Export |
| MODERATEUR | Modération signalements + Observatoire |
| INSTITUTION | Lecture données + Observatoire + Export |
| DATA_VIEW_ONLY | Observatoire uniquement |

## Conformité RGPD

- Consentement obligatoire à l'inscription
- Suppression complète du compte (droit à l'effacement)
- Anonymisation des données pour l'export
- Journal d'audit des actions administratives
- Sanitisation des inputs (protection XSS)

## Installation

### Prérequis
- Node.js 20+
- PostgreSQL 16+
- npm ou yarn

### Développement local

```bash
# 1. Cloner le projet
git clone <repo-url>
cd observatoire-simplification-pme

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Initialiser la base de données
npx prisma db push
npx prisma db seed

# 5. Lancer le serveur de développement
npm run dev
```

### Avec Docker

```bash
# 1. Configurer les variables d'environnement
cp .env.example .env

# 2. Lancer les services
docker-compose up -d

# 3. Initialiser la base de données
docker-compose exec app npx prisma db push
docker-compose exec app npx prisma db seed
```

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@observatoire-pme.fr | Admin123! |
| Entrepreneur | demo@entreprise.fr | Demo1234! |
| Analyste | analyste@observatoire-pme.fr | Analyste1! |

## Tests

```bash
# Lancer tous les tests
npm test

# Lancer les tests une fois
npm run test:run
```

## Déploiement

### Vercel
1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement (DATABASE_URL, NEXTAUTH_SECRET, etc.)
3. Déployer

### Railway
1. Créer un nouveau projet Railway
2. Ajouter un service PostgreSQL
3. Configurer les variables d'environnement
4. Déployer depuis GitHub

## Variables d'Environnement

| Variable | Description |
|----------|-------------|
| DATABASE_URL | URL de connexion PostgreSQL |
| NEXTAUTH_URL | URL de l'application |
| NEXTAUTH_SECRET | Secret JWT NextAuth |
| OPENAI_API_KEY | Clé API OpenAI (optionnel, pour les fonctions IA) |

## Algorithmes de Scoring

### ICG (Indice de Complexité Globale)
```
ICG = (Temps admin hebdo × 0.3) + (Nombre déclarations × 0.2)
    + (Coût conformité / CA × 0.2) + (Score subjectif × 0.2)
    + (Nombre interlocuteurs × 0.1)
```
Tous les composants sont normalisés sur 100 avant pondération.

### Score de Gravité (Signalements)
```
Gravité = (Temps perdu × 0.4) + (Coût estimé × 0.3) + (Votes × 0.3)
```

### SSD (Score Santé Dirigeant)
Moyenne normalisée des 4 dimensions (fatigue, charge émotionnelle, isolement, décision). Alerte si > 70/100.
