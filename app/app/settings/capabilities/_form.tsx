"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCapabilities, capabilityQueryKey } from "@/hooks/capabilities/CapabilitiesProvider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { CAPABILITY_LABELS } from "@/lib/capabilities/presentation";
import { useT } from "@/hooks/i18n/useT";

export function CapabilitiesForm() {
  const t = useT();
  const model = useCapabilities();
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function change(id: string, enabled: boolean) {
    if (!model || pending) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/settings/capabilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capability: id, enabled }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Não foi possível salvar.");
      }
      await client.invalidateQueries({ queryKey: capabilityQueryKey(model.organization_id) });
      setMessage("Habilitação atualizada. Os dados existentes foram preservados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }
  if (!model) return <p role="status">{t("Consultando disponibilidade…")}</p>;
  return (
    <div className="space-y-4">
      {model.error && <p role="alert">{t(model.error)}</p>}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Módulos e capacidades")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Disponibilidade para esta organização. Desativar preserva os dados existentes.")}
        </p>
      </header>
      {!model.can_manage && (
        <p className="text-sm text-muted-foreground">
          {t("Somente um administrador pode alterar a habilitação.")}
        </p>
      )}
      {model.capabilities.map((capability) => (
        <Card
          key={capability.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <h2 id={`label-${capability.id}`} className="font-semibold">
              {t(capability.name)}
            </h2>
            <p className="text-sm text-muted-foreground">{t(capability.description)}</p>
            <p className="text-sm">{t(CAPABILITY_LABELS[capability.state])}</p>
            {capability.reason && (
              <p id={`reason-${capability.id}`} className="text-sm text-muted-foreground">
                {t(capability.reason)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("Revisão")} {capability.revision}
            </p>
          </div>
          <Switch
            aria-labelledby={`label-${capability.id}`}
            aria-describedby={capability.reason ? `reason-${capability.id}` : undefined}
            checked={capability.enabled}
            disabled={!model.can_manage || pending || !capability.supported}
            onCheckedChange={(enabled) => {
              void change(capability.id, enabled);
            }}
          />
        </Card>
      ))}
      <p role="status" aria-live="polite" className="text-sm">
        {t(message)}
      </p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          void client.invalidateQueries({ queryKey: capabilityQueryKey(model.organization_id) });
        }}
      >
        {t("Atualizar disponibilidade")}
      </Button>
    </div>
  );
}
