import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedSession,
  checkPermission,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    if (!checkPermission(session.user.role, "observatory:read")) {
      return errorResponse("Accès refusé", 403);
    }

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get("sector");
    const sizeMin = searchParams.get("sizeMin");
    const sizeMax = searchParams.get("sizeMax");

    // Build company filter
    const companyFilter: Record<string, unknown> = {};
    if (sector) companyFilter.sector = sector;
    if (sizeMin || sizeMax) {
      companyFilter.effectif = {};
      if (sizeMin)
        (companyFilter.effectif as Record<string, number>).gte =
          parseInt(sizeMin);
      if (sizeMax)
        (companyFilter.effectif as Record<string, number>).lte =
          parseInt(sizeMax);
    }

    const diagnosticFilter: Record<string, unknown> = {};
    if (Object.keys(companyFilter).length > 0) {
      diagnosticFilter.company = companyFilter;
    }

    // 1. Regional data (heatmap)
    const regionalData = await prisma.diagnostic.groupBy({
      by: ["companyId"],
      _avg: { complexityScore: true },
      _count: true,
    });

    // Get companies for regions
    const companyIds = regionalData.map((r) => r.companyId);
    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, region: true, sector: true },
    });

    const regionMap = new Map(companies.map((c) => [c.id, c]));

    const regionAggregation: Record<
      string,
      { totalScore: number; count: number }
    > = {};
    for (const r of regionalData) {
      const company = regionMap.get(r.companyId);
      if (!company) continue;
      if (sector && company.sector !== sector) continue;

      const region = company.region;
      if (!regionAggregation[region]) {
        regionAggregation[region] = { totalScore: 0, count: 0 };
      }
      regionAggregation[region].totalScore +=
        (r._avg.complexityScore || 0) * r._count;
      regionAggregation[region].count += r._count;
    }

    const heatmapData = Object.entries(regionAggregation).map(
      ([region, data]) => ({
        region,
        avgScore: Math.round((data.totalScore / data.count) * 100) / 100,
        count: data.count,
      })
    );

    // 2. Top 10 irritants
    const topIrritants = await prisma.signalement.findMany({
      orderBy: { severityScore: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        severityScore: true,
        votesCount: true,
        sector: true,
        level: true,
      },
    });

    // 3. Average complexity score
    const avgScore = await prisma.diagnostic.aggregate({
      _avg: { complexityScore: true },
      _count: true,
    });

    // 4. Quarterly trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 18);

    const trendDiagnostics = await prisma.diagnostic.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { complexityScore: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const quarterlyData: Record<
      string,
      { totalScore: number; count: number }
    > = {};
    for (const d of trendDiagnostics) {
      const date = new Date(d.createdAt);
      const quarter = `${date.getFullYear()}-T${Math.ceil((date.getMonth() + 1) / 3)}`;
      if (!quarterlyData[quarter]) {
        quarterlyData[quarter] = { totalScore: 0, count: 0 };
      }
      quarterlyData[quarter].totalScore += d.complexityScore;
      quarterlyData[quarter].count++;
    }

    const trendData = Object.entries(quarterlyData).map(
      ([period, data]) => ({
        period,
        avgScore: Math.round((data.totalScore / data.count) * 100) / 100,
        count: data.count,
      })
    );

    // 5. Sector breakdown
    const sectorDiagnostics = await prisma.diagnostic.findMany({
      select: { complexityScore: true, company: { select: { sector: true } } },
    });

    const sectorAgg: Record<
      string,
      { totalScore: number; count: number }
    > = {};
    for (const d of sectorDiagnostics) {
      const s = d.company.sector;
      if (!sectorAgg[s]) sectorAgg[s] = { totalScore: 0, count: 0 };
      sectorAgg[s].totalScore += d.complexityScore;
      sectorAgg[s].count++;
    }

    const sectorData = Object.entries(sectorAgg).map(([sectorName, data]) => ({
      sector: sectorName,
      avgScore: Math.round((data.totalScore / data.count) * 100) / 100,
      count: data.count,
    }));

    return successResponse({
      heatmapData,
      topIrritants,
      averageScore: {
        score: avgScore._avg.complexityScore
          ? Math.round(avgScore._avg.complexityScore * 100) / 100
          : 0,
        totalDiagnostics: avgScore._count,
      },
      trendData,
      sectorData,
    });
  } catch (error) {
    console.error("Observatory data error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
