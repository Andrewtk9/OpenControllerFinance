"use client";

import { useTransition } from "react";
import { CATEGORIES } from "./categories";
import { updateTransactionCategory } from "@/app/actions";

export function CategorySelect({
  transactionId,
  category,
}: {
  transactionId: string;
  category: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={category}
      disabled={isPending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => updateTransactionCategory(transactionId, value));
      }}
      className={`w-full max-w-44 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none transition-opacity focus:border-emerald-500 ${
        isPending ? "opacity-50" : ""
      }`}
      title="Alterar categoria desta transação"
    >
      {!(CATEGORIES as readonly string[]).includes(category) && (
        <option value={category}>{category}</option>
      )}
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
