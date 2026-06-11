import { redirect } from "next/navigation";
import { getSettings } from "@/lib/budget";

/**
 * Gate de onboarding: se o usuário ainda não escolheu o tipo de perfil
 * (profileType === null), redireciona para /bem-vindo.
 *
 * Uso — chame no topo do server component da página:
 *
 *   import { OnboardingGate } from "@/app/onboarding-gate";
 *   ...
 *   export default async function MinhaPage() {
 *     await OnboardingGate();
 *     ...
 *   }
 *
 * NÃO usar em /bem-vindo nem /planos (causaria loop de redirect).
 * Implementado sem middleware porque o Prisma não roda no edge runtime.
 */
export async function OnboardingGate() {
  let profileType: string | null;
  try {
    profileType = (await getSettings()).profileType;
  } catch {
    // DB ainda não criado/migrado — não bloqueia a página
    return null;
  }
  if (profileType === null) {
    redirect("/bem-vindo");
  }
  return null;
}
