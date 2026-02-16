import { NextRequest } from "next/server";
import {
  getAuthenticatedSession,
  errorResponse,
  successResponse,
} from "@/lib/api-utils";
import { deleteUserAccount } from "@/middleware/gdpr";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) return errorResponse("Non authentifié", 401);

    await deleteUserAccount(session.user.id);

    return successResponse({
      message: "Votre compte et toutes vos données ont été supprimés.",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return errorResponse("Erreur interne du serveur", 500);
  }
}
