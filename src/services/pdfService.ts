import jsPDF from "jspdf";
import "jspdf-autotable";
import type { ComplexityScore } from "@/types";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

interface DiagnosticPDFData {
  companyName: string;
  sector: string;
  region: string;
  date: string;
  score: ComplexityScore;
  rawAnswers: Record<string, unknown>;
}

export function generateDiagnosticPDF(data: DiagnosticPDFData): jsPDF {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(30, 58, 138); // primary blue
  doc.rect(0, 0, 210, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Observatoire de la Simplification", 20, 18);
  doc.setFontSize(14);
  doc.text("& Performance PME", 20, 28);

  doc.setFontSize(10);
  doc.text(`Rapport de Diagnostic - ${data.date}`, 20, 36);

  // Company info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("Profil Entreprise", 20, 55);

  doc.setFontSize(10);
  doc.text(`Entreprise : ${data.companyName}`, 20, 65);
  doc.text(`Secteur : ${data.sector}`, 20, 72);
  doc.text(`Région : ${data.region}`, 20, 79);

  // Global score
  doc.setFontSize(16);
  doc.text("Score de Complexité Globale (ICG)", 20, 95);

  const scoreColor = getScoreColor(data.score.global);
  doc.setFillColor(scoreColor.r, scoreColor.g, scoreColor.b);
  doc.roundedRect(20, 100, 170, 25, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(
    `${data.score.global.toFixed(1)} / 100`,
    105,
    117,
    { align: "center" }
  );

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(getScoreLabel(data.score.global), 105, 122, { align: "center" });

  // Domain scores table
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("Scores par Domaine", 20, 140);

  doc.autoTable({
    startY: 145,
    head: [["Domaine", "Score", "Niveau"]],
    body: [
      [
        "Complexité Fiscale",
        `${data.score.fiscal.toFixed(1)} / 100`,
        getScoreLabel(data.score.fiscal),
      ],
      [
        "Complexité Sociale",
        `${data.score.social.toFixed(1)} / 100`,
        getScoreLabel(data.score.social),
      ],
      [
        "Complexité Administrative",
        `${data.score.admin.toFixed(1)} / 100`,
        getScoreLabel(data.score.admin),
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 58, 138] },
  });

  // Score components breakdown
  doc.setFontSize(14);
  doc.text("Détail des Composantes ICG", 20, 200);

  doc.autoTable({
    startY: 205,
    head: [["Composante", "Poids", "Contribution"]],
    body: [
      [
        "Temps administratif",
        "30%",
        data.score.details.tempsAdminComponent.toFixed(2),
      ],
      [
        "Déclarations fiscales",
        "20%",
        data.score.details.declarationsComponent.toFixed(2),
      ],
      [
        "Coût conformité / CA",
        "20%",
        data.score.details.coutConformiteComponent.toFixed(2),
      ],
      [
        "Difficulté perçue",
        "20%",
        data.score.details.scoreSubjectifComponent.toFixed(2),
      ],
      [
        "Nombre interlocuteurs",
        "10%",
        data.score.details.interlocuteursComponent.toFixed(2),
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 58, 138] },
  });

  // Recommendations page
  doc.addPage();
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Recommandations", 20, 14);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  let y = 35;

  const recommendations = generateRecommendations(data.score);
  recommendations.forEach((rec, i) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${i + 1}. ${rec.title}`, 20, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(rec.description, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 8;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Observatoire de la Simplification & Performance PME - Données conformes RGPD",
    105,
    285,
    { align: "center" }
  );

  return doc;
}

function getScoreColor(score: number): { r: number; g: number; b: number } {
  if (score <= 30) return { r: 34, g: 139, b: 34 }; // Green
  if (score <= 50) return { r: 255, g: 165, b: 0 }; // Orange
  if (score <= 70) return { r: 255, g: 99, b: 71 }; // Tomato
  return { r: 220, g: 20, b: 60 }; // Red
}

function getScoreLabel(score: number): string {
  if (score <= 30) return "Complexité faible";
  if (score <= 50) return "Complexité modérée";
  if (score <= 70) return "Complexité élevée";
  return "Complexité critique";
}

function generateRecommendations(
  score: ComplexityScore
): { title: string; description: string }[] {
  const recs: { title: string; description: string }[] = [];

  if (score.fiscal > 50) {
    recs.push({
      title: "Simplification fiscale",
      description:
        "Votre complexité fiscale est élevée. Étudiez la possibilité de regrouper vos déclarations, d'utiliser un logiciel de comptabilité intégré et de déléguer davantage à un expert-comptable pour optimiser le temps consacré.",
    });
  }

  if (score.social > 50) {
    recs.push({
      title: "Optimisation des procédures RH",
      description:
        "La gestion sociale de votre entreprise est complexe. Envisagez de centraliser vos interlocuteurs, d'automatiser les procédures RH récurrentes et de vous rapprocher d'un guichet unique pour les démarches sociales.",
    });
  }

  if (score.admin > 50) {
    recs.push({
      title: "Réduction de la charge administrative",
      description:
        "Votre charge administrative est importante. Identifiez les doubles saisies et les procédures redondantes. L'utilisation d'outils numériques intégrés peut réduire significativement le temps consacré.",
    });
  }

  if (score.details.tempsAdminComponent > 15) {
    recs.push({
      title: "Gestion du temps administratif",
      description:
        "Le temps consacré à l'administratif est un levier majeur. Dédiez des créneaux fixes, formez un collaborateur aux tâches récurrentes et automatisez ce qui peut l'être.",
    });
  }

  if (score.details.coutConformiteComponent > 10) {
    recs.push({
      title: "Maîtrise des coûts de conformité",
      description:
        "Les coûts de conformité représentent une part significative de votre CA. Comparez les offres d'accompagnement, mutualisez les services avec d'autres PME et surveillez les aides disponibles.",
    });
  }

  if (recs.length === 0) {
    recs.push({
      title: "Maintenir votre efficacité",
      description:
        "Votre niveau de complexité est bien maîtrisé. Continuez à surveiller vos indicateurs et restez attentif aux évolutions réglementaires qui pourraient impacter votre activité.",
    });
  }

  return recs;
}
