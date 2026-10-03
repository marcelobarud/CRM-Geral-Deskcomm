"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
export function StageProbabilityEditor({
  name,
  value,
  disabled,
  onSave,
}: {
  name: string;
  value: number | null;
  disabled: boolean;
  onSave: (value: number | null) => void;
}) {
  const t = useT(),
    id = useId(),
    [draft, setDraft] = useState(value === null ? "" : String(value));
  return (
    <form
      className="min-w-0 space-y-1 sm:w-44 sm:shrink-0"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft === "" ? null : Number(draft));
      }}
    >
      <label className="block text-xs" htmlFor={id}>
        {t("Probabilidade (%)")} · {name}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={100}
        step={1}
        value={draft}
        disabled={disabled}
        className="w-full rounded-md border p-2"
        onChange={(e) => setDraft(e.target.value)}
        aria-describedby={id + "-help"}
      />
      <p id={id + "-help"} className="text-xs text-text-muted">
        {t("Estimativa comercial. Vazio = não configurada.")}
      </p>
      <Button
        size="sm"
        variant="outline"
        type="submit"
        disabled={disabled || draft === (value === null ? "" : String(value))}
      >
        {t("Salvar probabilidade")}
      </Button>
    </form>
  );
}
