"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { db, getSettings } from "@/lib/local/db";
import { pluggyAuth, createConnectToken } from "@/lib/local/pluggy";

// widget só existe no browser
const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((m) => m.PluggyConnect),
  { ssr: false }
);

type State = "idle" | "loading" | "open" | "error";

export function ConnectBankButton({ onConnected }: { onConnected?: () => void }) {
  const [state, setState] = useState<State>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBank, setLastBank] = useState<string | null>(null);

  async function open() {
    setState("loading");
    setError(null);
    try {
      const s = await getSettings();
      if (!s.pluggyClientId || !s.pluggyClientSecret) {
        throw new Error(
          "Preencha o Client ID e o Client Secret da Pluggy primeiro."
        );
      }
      await pluggyAuth(s.pluggyClientId, s.pluggyClientSecret);
      setToken(await createConnectToken());
      setState("open");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  async function handleSuccess(data: { item: { id: string; connector?: { name?: string } } }) {
    const itemId = data.item.id;
    const bank = data.item.connector?.name ?? "banco";
    const s = await getSettings();
    const ids = (s.pluggyItemIds ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!ids.includes(itemId)) ids.push(itemId);
    await db.settings.update(1, { pluggyItemIds: ids.join(",") });
    setLastBank(bank);
    setToken(null);
    setState("idle");
    onConnected?.();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={open}
        disabled={state === "loading" || state === "open"}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        🏦 {state === "loading" ? "Preparando…" : "Conectar banco"}
      </button>
      <p className="text-xs text-slate-500">
        Abre a conexão oficial do Open Finance: você escolhe o banco, aprova no
        app dele, e a conexão fica salva aqui automaticamente.
      </p>
      {lastBank && (
        <p className="text-xs font-medium text-emerald-400">
          ✓ {lastBank} conectado! Toque em Sincronizar no Dashboard para puxar os
          dados.
        </p>
      )}
      {state === "error" && error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
      {state === "open" && token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox={false}
          onSuccess={handleSuccess}
          onError={(e: { message?: string }) => {
            setError(e?.message ?? "Falha na conexão com o banco.");
            setToken(null);
            setState("error");
          }}
          onClose={() => {
            setToken(null);
            setState("idle");
          }}
        />
      )}
    </div>
  );
}
