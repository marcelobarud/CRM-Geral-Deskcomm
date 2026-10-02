"use client";

import { Archive, DotsThree, MapPin, PencilSimple } from "@/lib/ui/icons";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, getStatusVariant, type Asset } from "../_data/fixtures";

export type MobileTableStrategy = "priority" | "row-card";

type AssetTableProps = {
  assets: Asset[];
  strategy: MobileTableStrategy;
  onOpen: (asset: Asset) => void;
  onArchive: (asset: Asset) => void;
};

function StatusBadge({ status }: { status: Asset["status"] }) {
  return <Badge variant={getStatusVariant(status)}>{status}</Badge>;
}

function AssetActionButtons({
  asset,
  onOpen,
  onArchive,
}: Omit<AssetTableProps, "assets" | "strategy"> & { asset: Asset }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        aria-label={`Editar ${asset.name}`}
        title={`Editar ${asset.name}`}
        onClick={() => onOpen(asset)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-accent-soft hover:text-accent focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-hidden"
      >
        <PencilSimple size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Arquivar ${asset.name}`}
        title={`Arquivar ${asset.name}`}
        onClick={() => onArchive(asset)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-error-bg hover:text-error focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-hidden"
      >
        <Archive size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={`Mais ações para ${asset.name}`}
        title="Mais ações"
        onClick={() => onOpen(asset)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-accent-soft hover:text-accent focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-hidden"
      >
        <DotsThree size={18} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

export function AssetTable({ assets, strategy, onOpen, onArchive }: AssetTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      <div className="hidden md:block">
        <Table aria-label="Ativos cadastrados">
          <caption className="sr-only">Lista de ativos da Central de Ativos</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Ativo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última inspeção</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="pr-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="max-w-[16rem] pl-4">
                  <button
                    type="button"
                    onClick={() => onOpen(asset)}
                    className="block max-w-full truncate text-left font-medium text-text underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                    title={asset.name}
                  >
                    {asset.name}
                  </button>
                </TableCell>
                <TableCell className="text-text-muted">{asset.category}</TableCell>
                <TableCell className="text-text-muted">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <MapPin size={14} aria-hidden="true" />
                    {asset.location}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={asset.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-text-muted">
                  {formatDate(asset.lastInspection)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs whitespace-nowrap text-text tabular-nums">
                  {formatCurrency(asset.costCents)}
                </TableCell>
                <TableCell className="pr-4">
                  <AssetActionButtons asset={asset} onOpen={onOpen} onArchive={onArchive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden" data-testid={`mobile-table-${strategy}`}>
        <div className="bg-surface-muted border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text">Ativos</h3>
              <p className="text-xs text-text-muted">
                {strategy === "priority"
                  ? "Estratégia A · colunas prioritárias"
                  : "Estratégia B · registro em card"}
              </p>
            </div>
            <span className="font-mono text-xs text-text-muted tabular-nums">
              {assets.length} itens
            </span>
          </div>
        </div>

        {strategy === "priority" ? (
          <div className="divide-y divide-border">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => onOpen(asset)}
                  className="min-w-0 text-left focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                  <span className="block truncate text-sm font-medium text-text" title={asset.name}>
                    {asset.name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {asset.category} · {asset.location}
                  </span>
                </button>
                <StatusBadge status={asset.status} />
                <button
                  type="button"
                  onClick={() => onOpen(asset)}
                  className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-xs font-medium text-accent hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                >
                  Ver
                  <span className="sr-only"> detalhes de {asset.name}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 p-3">
            {assets.map((asset) => (
              <article
                key={asset.id}
                className={cn("min-w-0 rounded-md border border-border bg-bg p-4", "shadow-xs")}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpen(asset)}
                    className="min-w-0 flex-1 text-left focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:outline-hidden"
                  >
                    <h3 className="truncate text-sm font-semibold text-text" title={asset.name}>
                      {asset.name}
                    </h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {asset.category} · {asset.location}
                    </p>
                  </button>
                  <span className="shrink-0">
                    <StatusBadge status={asset.status} />
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <dt className="text-text-subtle">Inspeção</dt>
                    <dd className="mt-0.5 text-text-muted">{formatDate(asset.lastInspection)}</dd>
                  </div>
                  <div>
                    <dt className="text-text-subtle">Custo</dt>
                    <dd className="mt-0.5 font-mono text-text-muted tabular-nums">
                      {formatCurrency(asset.costCents)}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex justify-end">
                  <AssetActionButtons asset={asset} onOpen={onOpen} onArchive={onArchive} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
