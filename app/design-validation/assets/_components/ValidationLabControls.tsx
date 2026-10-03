"use client";

import { Funnel } from "@/lib/ui/icons";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type ValidationScenario =
  | "default"
  | "filters-active"
  | "filters-many"
  | "empty-natural"
  | "empty-filtered"
  | "loading"
  | "error";

export type BannerVariant = "info" | "warning" | "error" | "hidden";

type ValidationLabControlsProps = {
  scenario: ValidationScenario;
  banner: BannerVariant;
  tableStrategy: "priority" | "row-card";
  onScenarioChange: (value: ValidationScenario) => void;
  onBannerChange: (value: BannerVariant) => void;
  onTableStrategyChange: (value: "priority" | "row-card") => void;
};

export function ValidationLabControls({
  scenario,
  banner,
  tableStrategy,
  onScenarioChange,
  onBannerChange,
  onTableStrategyChange,
}: ValidationLabControlsProps) {
  return (
    <details className="group bg-surface-muted rounded-lg border border-dashed border-border-strong">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-text [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <Funnel size={16} aria-hidden="true" />
          Controles de validação
        </span>
        <Badge variant="neutral" className="group-open:hidden">
          laboratório
        </Badge>
      </summary>
      <div className="grid gap-4 border-t border-dashed border-border-strong p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="validation-scenario">Estado</Label>
          <Select
            value={scenario}
            onValueChange={(value) => onScenarioChange(value as ValidationScenario)}
          >
            <SelectTrigger id="validation-scenario">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="filters-active">Um filtro ativo</SelectItem>
              <SelectItem value="filters-many">Vários filtros ativos</SelectItem>
              <SelectItem value="empty-natural">Empty natural</SelectItem>
              <SelectItem value="empty-filtered">Empty filtered</SelectItem>
              <SelectItem value="loading">Loading</SelectItem>
              <SelectItem value="error">Error recuperável</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="validation-banner">Status Banner</Label>
          <Select value={banner} onValueChange={(value) => onBannerChange(value as BannerVariant)}>
            <SelectTrigger id="validation-banner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="hidden">Oculto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="validation-table">Tabela mobile</Label>
          <Select
            value={tableStrategy}
            onValueChange={(value) => onTableStrategyChange(value as "priority" | "row-card")}
          >
            <SelectTrigger id="validation-table">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">A · Priority Columns</SelectItem>
              <SelectItem value="row-card">B · Row-to-Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="px-4 pb-4 text-xs leading-relaxed text-text-muted">
        Este painel pertence ao laboratório e será removido junto com o experimento. Ele não
        representa uma feature da Central de Ativos.
      </p>
    </details>
  );
}
