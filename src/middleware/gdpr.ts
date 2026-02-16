import { prisma } from "@/lib/prisma";

/**
 * Log an admin action for GDPR audit trail.
 */
export async function logAuditAction(
  userId: string,
  action: string,
  details?: string,
  ipAddress?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      details,
      ipAddress,
    },
  });
}

/**
 * Anonymize user data for export (GDPR compliant).
 */
export function anonymizeUserData(data: Record<string, unknown>) {
  const anonymized = { ...data };
  const sensitiveFields = ["email", "name", "passwordHash", "ipAddress"];

  for (const field of sensitiveFields) {
    if (field in anonymized) {
      anonymized[field] = "[ANONYMISÉ]";
    }
  }

  return anonymized;
}

/**
 * Complete user account deletion (GDPR right to erasure).
 */
export async function deleteUserAccount(userId: string) {
  // Delete in order of dependencies
  await prisma.vote.deleteMany({ where: { userId } });
  await prisma.healthAssessment.deleteMany({ where: { userId } });
  await prisma.diagnostic.deleteMany({ where: { userId } });
  await prisma.signalement.deleteMany({ where: { userId } });
  await prisma.company.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });

  // Anonymize audit logs rather than delete (legal requirement)
  await prisma.auditLog.updateMany({
    where: { userId },
    data: { details: "[COMPTE SUPPRIMÉ]" },
  });

  // Finally delete the user
  await prisma.user.delete({ where: { id: userId } });
}
