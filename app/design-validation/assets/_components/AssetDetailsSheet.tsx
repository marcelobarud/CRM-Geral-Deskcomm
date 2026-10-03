"use client";

import { Archive, CalendarBlank, CheckCircle, Clock, MapPin, PencilSimple } from "@/lib/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, formatDate, getStatusVariant, type Asset } from "../_data/fixtures";

type AssetDetailsSheetProps = {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (asset: Asset) => void;
  onArchive: (asset: Asset) => void;
};

export function AssetDetailsSheet({
  asset,
  open,
  onOpenChange,
  onEdit,
  onArchive,
}: AssetDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-y-auto p-5 sm:w-[min(90vw,30rem)] sm:p-6"
      >
        {asset && (
          <>
            <SheetHeader className="pr-8 text-left">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={getStatusVariant(asset.status)}>{asset.status}</Badge>
              </div>
              <SheetTitle className="text-xl">{asset.name}</SheetTitle>
              <SheetDescription>
                Detalhes e histórico resumido do ativo selecionado.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto py-6">
              <dl className="bg-surface-muted grid grid-cols-2 gap-x-4 gap-y-5 rounded-lg border border-border p-4 text-sm">
                <div>
                  <dt className="text-xs text-text-subtle">Categoria</dt>
                  <dd className="mt-1 font-medium text-text">{asset.category}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-subtle">Localização</dt>
                  <dd className="mt-1 inline-flex items-center gap-1 text-text">
                    <MapPin size={14} aria-hidden="true" />
                    {asset.location}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-subtle">Custo</dt>
                  <dd className="mt-1 font-mono text-xs text-text tabular-nums">
                    {formatCurrency(asset.costCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-subtle">Última inspeção</dt>
                  <dd className="mt-1 text-text">{formatDate(asset.lastInspection)}</dd>
                </div>
              </dl>

              <section aria-labelledby="asset-observation-title">
                <h3 id="asset-observation-title" className="text-sm font-semibold text-text">
                  Observação
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {asset.notes ?? "Nenhuma observação registrada para este ativo."}
                </p>
              </section>

              <section aria-labelledby="asset-history-title">
                <h3 id="asset-history-title" className="text-sm font-semibold text-text">
                  Histórico simplificado
                </h3>
                <ol className="mt-3 space-y-4 border-l border-border pl-4">
                  <li className="relative">
                    <CheckCircle
                      size={16}
                      className="absolute top-0.5 -left-[25px] text-success"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-text">Registro atualizado</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      12 de setembro de 2026 · dados fictícios
                    </p>
                  </li>
                  <li className="relative">
                    <CalendarBlank
                      size={16}
                      className="absolute top-0.5 -left-[25px] text-text-subtle"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-text">Inspeção registrada</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {formatDate(asset.lastInspection)}
                    </p>
                  </li>
                  <li className="relative">
                    <Clock
                      size={16}
                      className="absolute top-0.5 -left-[25px] text-text-subtle"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-text">Ativo adicionado</p>
                    <p className="mt-0.5 text-xs text-text-muted">Primeiro registro do histórico</p>
                  </li>
                </ol>
              </section>
            </div>

            <SheetFooter className="gap-2 border-t border-border pt-4 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onArchive(asset)}
                className="text-error hover:bg-error-bg hover:text-error sm:mr-auto"
              >
                <Archive size={16} aria-hidden="true" />
                Arquivar
              </Button>
              <Button type="button" variant="outline" onClick={() => onEdit(asset)}>
                <PencilSimple size={16} aria-hidden="true" />
                Editar
              </Button>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
