-- Migration CPME - Schema complet
-- Exécuter dans Supabase SQL Editor : https://supabase.com/dashboard/project/jqcqdfvtpllxknvjoczx/sql

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PRESIDENT', 'DELEGUE_GENERAL', 'TRESORIER', 'MEMBRE_BUREAU', 'MEMBRE_CA', 'ADHERENT');

-- CreateEnum
CREATE TYPE "AdherentType" AS ENUM ('DIRECT', 'FEDERATION', 'SYNDICAT');

-- CreateEnum
CREATE TYPE "Secteur" AS ENUM ('COMMERCE', 'INDUSTRIE', 'SERVICES', 'BTP');

-- CreateEnum
CREATE TYPE "CotisationStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MandatClassification" AS ENUM ('STRATEGIQUE', 'TECHNIQUE');

-- CreateEnum
CREATE TYPE "MandatAssignmentStatus" AS ENUM ('ACTIVE', 'TERMINE', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "CandidatureStatus" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('JURIDIQUE', 'PRESSE', 'COTISATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OUVERT', 'EN_COURS', 'RESOLU', 'FERME');

-- CreateEnum
CREATE TYPE "PresenceType" AS ENUM ('PRESENTIEL', 'VISIO');

-- CreateEnum
CREATE TYPE "VoteSessionStatus" AS ENUM ('EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "MatchingFundStatus" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REFUSE');

-- CreateEnum
CREATE TYPE "FormationStatus" AS ENUM ('DISPONIBLE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "AppelOffreStatus" AS ENUM ('OUVERT', 'FERME', 'ATTRIBUE');

-- CreateEnum
CREATE TYPE "SuiviFormationStatus" AS ENUM ('INSCRIT', 'EN_COURS', 'TERMINE', 'ABANDONNE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADHERENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adherent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AdherentType" NOT NULL DEFAULT 'DIRECT',
    "siret" TEXT,
    "companyName" TEXT NOT NULL,
    "secteur" "Secteur" NOT NULL,
    "effectif" INTEGER NOT NULL,
    "caAnnuel" DOUBLE PRECISION,
    "isVIP" BOOLEAN NOT NULL DEFAULT false,
    "memberSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Adherent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotisation" (
    "id" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "CotisationStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "invoiceRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cotisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotisationBareme" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "effectifMin" INTEGER NOT NULL,
    "effectifMax" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CotisationBareme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convocation" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "onlineLink" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Convocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emargement" (
    "id" TEXT NOT NULL,
    "convocationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "presenceType" "PresenceType" NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Emargement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteSession" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "convocationId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "status" "VoteSessionStatus" NOT NULL DEFAULT 'EN_COURS',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoteSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "voteSessionId" TEXT NOT NULL,
    "encryptedVote" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementDeclaration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tempsAlloue" DOUBLE PRECISION NOT NULL,
    "axesPactes" JSONB NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EngagementDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisme" TEXT NOT NULL,
    "classification" "MandatClassification" NOT NULL,
    "description" TEXT,
    "feuilleDeRoute" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Mandat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandatAssignment" (
    "id" TEXT NOT NULL,
    "mandatId" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "MandatAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MandatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandatCandidature" (
    "id" TEXT NOT NULL,
    "mandatId" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "motivation" TEXT,
    "status" "CandidatureStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MandatCandidature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandatReport" (
    "id" TEXT NOT NULL,
    "mandatAssignmentId" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "decisionsClefs" TEXT NOT NULL,
    "pointsAlerte" TEXT,
    "voteEmis" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MandatReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingFundDon" (
    "id" TEXT NOT NULL,
    "meceneName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchingFundDon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingFundAbondement" (
    "id" TEXT NOT NULL,
    "donId" TEXT NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "animateurName" TEXT NOT NULL,
    "validatedById" TEXT,
    "status" "MatchingFundStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchingFundAbondement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "duration" TEXT,
    "status" "FormationStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppelOffre" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "AppelOffreStatus" NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppelOffre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppelOffreResponse" (
    "id" TEXT NOT NULL,
    "appelOffreId" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppelOffreResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuiviFormation" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "adherentId" TEXT NOT NULL,
    "status" "SuiviFormationStatus" NOT NULL DEFAULT 'INSCRIT',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SuiviFormation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "adherentId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "category" "TicketCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OUVERT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

CREATE UNIQUE INDEX "Adherent_userId_key" ON "Adherent"("userId");
CREATE UNIQUE INDEX "Adherent_siret_key" ON "Adherent"("siret");
CREATE INDEX "Adherent_secteur_idx" ON "Adherent"("secteur");
CREATE INDEX "Adherent_type_idx" ON "Adherent"("type");
CREATE INDEX "Adherent_isVIP_idx" ON "Adherent"("isVIP");
CREATE INDEX "Adherent_isActive_idx" ON "Adherent"("isActive");

CREATE INDEX "Cotisation_status_idx" ON "Cotisation"("status");
CREATE INDEX "Cotisation_year_idx" ON "Cotisation"("year");
CREATE INDEX "Cotisation_dueDate_idx" ON "Cotisation"("dueDate");
CREATE UNIQUE INDEX "Cotisation_adherentId_year_key" ON "Cotisation"("adherentId", "year");

CREATE INDEX "CotisationBareme_isActive_idx" ON "CotisationBareme"("isActive");

CREATE UNIQUE INDEX "Instance_name_key" ON "Instance"("name");

CREATE INDEX "Convocation_instanceId_idx" ON "Convocation"("instanceId");
CREATE INDEX "Convocation_date_idx" ON "Convocation"("date");

CREATE UNIQUE INDEX "Emargement_convocationId_userId_key" ON "Emargement"("convocationId", "userId");

CREATE INDEX "VoteSession_instanceId_idx" ON "VoteSession"("instanceId");
CREATE INDEX "VoteSession_status_idx" ON "VoteSession"("status");

CREATE INDEX "Vote_voteSessionId_idx" ON "Vote"("voteSessionId");

CREATE UNIQUE INDEX "EngagementDeclaration_userId_key" ON "EngagementDeclaration"("userId");

CREATE INDEX "Mandat_organisme_idx" ON "Mandat"("organisme");
CREATE INDEX "Mandat_classification_idx" ON "Mandat"("classification");
CREATE INDEX "Mandat_isActive_idx" ON "Mandat"("isActive");

CREATE INDEX "MandatAssignment_mandatId_idx" ON "MandatAssignment"("mandatId");
CREATE INDEX "MandatAssignment_adherentId_idx" ON "MandatAssignment"("adherentId");
CREATE INDEX "MandatAssignment_status_idx" ON "MandatAssignment"("status");

CREATE UNIQUE INDEX "MandatCandidature_mandatId_adherentId_key" ON "MandatCandidature"("mandatId", "adherentId");

CREATE INDEX "MandatReport_mandatAssignmentId_idx" ON "MandatReport"("mandatAssignmentId");
CREATE INDEX "MandatReport_createdAt_idx" ON "MandatReport"("createdAt");

CREATE INDEX "MatchingFundAbondement_status_idx" ON "MatchingFundAbondement"("status");

CREATE INDEX "AppelOffre_status_idx" ON "AppelOffre"("status");
CREATE INDEX "AppelOffre_deadline_idx" ON "AppelOffre"("deadline");

CREATE UNIQUE INDEX "AppelOffreResponse_appelOffreId_adherentId_key" ON "AppelOffreResponse"("appelOffreId", "adherentId");

CREATE UNIQUE INDEX "SuiviFormation_formationId_adherentId_key" ON "SuiviFormation"("formationId", "adherentId");

CREATE INDEX "Ticket_category_idx" ON "Ticket"("category");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_adherentId_idx" ON "Ticket"("adherentId");
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Adherent" ADD CONSTRAINT "Adherent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cotisation" ADD CONSTRAINT "Cotisation_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Convocation" ADD CONSTRAINT "Convocation_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Convocation" ADD CONSTRAINT "Convocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Emargement" ADD CONSTRAINT "Emargement_convocationId_fkey" FOREIGN KEY ("convocationId") REFERENCES "Convocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Emargement" ADD CONSTRAINT "Emargement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoteSession" ADD CONSTRAINT "VoteSession_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VoteSession" ADD CONSTRAINT "VoteSession_convocationId_fkey" FOREIGN KEY ("convocationId") REFERENCES "Convocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voteSessionId_fkey" FOREIGN KEY ("voteSessionId") REFERENCES "VoteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementDeclaration" ADD CONSTRAINT "EngagementDeclaration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MandatAssignment" ADD CONSTRAINT "MandatAssignment_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "Mandat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MandatAssignment" ADD CONSTRAINT "MandatAssignment_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MandatCandidature" ADD CONSTRAINT "MandatCandidature_mandatId_fkey" FOREIGN KEY ("mandatId") REFERENCES "Mandat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MandatCandidature" ADD CONSTRAINT "MandatCandidature_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MandatReport" ADD CONSTRAINT "MandatReport_mandatAssignmentId_fkey" FOREIGN KEY ("mandatAssignmentId") REFERENCES "MandatAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MandatReport" ADD CONSTRAINT "MandatReport_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchingFundAbondement" ADD CONSTRAINT "MatchingFundAbondement_donId_fkey" FOREIGN KEY ("donId") REFERENCES "MatchingFundDon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchingFundAbondement" ADD CONSTRAINT "MatchingFundAbondement_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppelOffre" ADD CONSTRAINT "AppelOffre_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppelOffreResponse" ADD CONSTRAINT "AppelOffreResponse_appelOffreId_fkey" FOREIGN KEY ("appelOffreId") REFERENCES "AppelOffre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppelOffreResponse" ADD CONSTRAINT "AppelOffreResponse_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuiviFormation" ADD CONSTRAINT "SuiviFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SuiviFormation" ADD CONSTRAINT "SuiviFormation_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_adherentId_fkey" FOREIGN KEY ("adherentId") REFERENCES "Adherent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
