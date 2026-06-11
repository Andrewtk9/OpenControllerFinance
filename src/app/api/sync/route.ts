import { NextResponse } from "next/server";
import { runSync, MissingPluggyCredentialsError } from "@/lib/sync";

// Sincronização pode demorar (várias contas/transações na Pluggy)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * GET /api/sync — dispara a sincronização bancária.
 *
 * Autorização (CRON_SECRET):
 * - Header `Authorization: Bearer <CRON_SECRET>` (formato enviado
 *   automaticamente pelo cron da Vercel), OU
 * - Query `?secret=<CRON_SECRET>` (para serviços externos, ex.: cron-job.org).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET não configurada. Defina a variável de ambiente CRON_SECRET no projeto da Vercel.",
      },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const querySecret = new URL(request.url).searchParams.get("secret");
  const authorized =
    authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;

  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runSync();
    return NextResponse.json(result, {
      status: result.status === "error" ? 500 : 200,
    });
  } catch (error) {
    if (error instanceof MissingPluggyCredentialsError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "error", newTransactions: 0, accounts: 0, errors: [msg], message: msg },
      { status: 500 }
    );
  }
}
