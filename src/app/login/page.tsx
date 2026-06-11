import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <h1 className="text-xl font-semibold text-slate-100">
          OpenController<span className="text-emerald-400">Finance</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Digite a senha para acessar seus dados financeiros.
        </p>
        <form action={login} className="mt-6 space-y-4">
          <input
            type="password"
            name="password"
            required
            autoFocus
            placeholder="Senha"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          {erro && (
            <p className="text-sm text-rose-400">Senha incorreta, tente novamente.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
