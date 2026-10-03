"use client";

import * as React from "react";
import {
  Archive,
  ArrowsClockwise,
  Bell,
  Buildings,
  CaretDoubleLeft,
  CaretDoubleRight,
  Info,
  List,
  MagnifyingGlass,
  Moon,
  Plus,
  Sun,
  Warning,
  X,
} from "@/lib/ui/icons";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ASSET_CATEGORIES,
  ASSET_FIXTURES,
  ASSET_LOCATIONS,
  ASSET_STATUSES,
  formatCurrency,
  type Asset,
} from "../_data/fixtures";
import { AssetDetailsSheet } from "./AssetDetailsSheet";
import { AssetFormSheet } from "./AssetFormSheet";
import { AssetTable, type MobileTableStrategy } from "./AssetTable";
import {
  ValidationLabControls,
  type BannerVariant,
  type ValidationScenario,
} from "./ValidationLabControls";
import { ValidationSidebar } from "./ValidationSidebar";
import { useTheme } from "@/lib/theme";

type FilterValues = {
  search: string;
  location: string;
  category: string;
  status: string;
  period: string;
};

const EMPTY_FILTERS: FilterValues = {
  search: "",
  location: "",
  category: "",
  status: "",
  period: "all",
};

const METRICS = [
  { label: "Ativos em operação", value: "128", context: "ativos", trend: "+6 no período" },
  { label: "Em manutenção", value: "9", context: "ativos", trend: "2 novos nesta semana" },
  {
    label: "Utilização média",
    value: "74%",
    context: "período atual",
    trend: "+4 p.p. vs. período anterior",
  },
  {
    label: "Custo no período",
    value: formatCurrency(4832000),
    context: "período atual",
    trend: "-3,2% vs. período anterior",
  },
] as const;

function hasFilters(filters: FilterValues) {
  return Boolean(
    filters.search ||
    filters.location ||
    filters.category ||
    filters.status ||
    filters.period !== "all",
  );
}

function StateIcon({ variant }: { variant: "info" | "warning" | "error" }) {
  if (variant === "info") return <Info size={18} aria-hidden="true" />;
  return <Warning size={18} aria-hidden="true" />;
}

function StatusBanner({
  variant,
  dismissed,
  onDismiss,
}: {
  variant: BannerVariant;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  if (variant === "hidden" || dismissed) return null;
  const isError = variant === "error";
  const isWarning = variant === "warning";
  return (
    <div
      className={[
        "flex gap-3 rounded-lg border p-4 text-sm",
        variant === "info" && "border-info/30 bg-info-bg text-info-fg",
        isWarning && "border-warning/30 bg-warning-bg text-warning-fg",
        isError && "border-error/30 bg-error-bg text-error-fg",
      ]
        .filter(Boolean)
        .join(" ")}
      role={isError ? "alert" : "status"}
    >
      <div className="mt-0.5 shrink-0">
        <StateIcon variant={variant === "info" ? "info" : variant} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {variant === "info"
            ? "7 ativos possuem manutenção programada para os próximos 7 dias."
            : "A sincronização do inventário está temporariamente indisponível."}
        </p>
        <p className="mt-1 text-xs opacity-80">
          {variant === "info"
            ? "Revise a programação para antecipar a próxima ação."
            : "Os dados exibidos continuam sendo os últimos registros disponíveis."}
        </p>
      </div>
      <button
        type="button"
        aria-label="Fechar aviso"
        className="shrink-0 rounded-sm p-1 opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-hidden"
        onClick={onDismiss}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function Metrics() {
  return (
    <section aria-labelledby="metrics-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="metrics-title" className="text-sm font-semibold text-text">
          Resumo do período
        </h2>
        <span className="text-xs text-text-muted">Atualizado há 12 min</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <Card key={metric.label} className="p-4">
            <p className="text-xs font-medium text-text-muted">{metric.label}</p>
            <p className="mt-3 font-mono text-2xl font-medium tracking-tight text-text tabular-nums">
              {metric.value}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
              <span>{metric.context}</span>
              <span aria-hidden="true">·</span>
              <span>{metric.trend}</span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

type FilterBarProps = {
  filters: FilterValues;
  onChange: (field: keyof FilterValues, value: string) => void;
  onReset: () => void;
};

function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  const active = hasFilters(filters);
  return (
    <section
      aria-labelledby="filters-title"
      className="rounded-lg border border-border bg-surface p-4 shadow-xs"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="filters-title" className="text-sm font-semibold text-text">
            Filtrar ativos
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Refine o escopo sem perder a visão do conjunto.
          </p>
        </div>
        {active && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <X size={15} aria-hidden="true" />
            Limpar filtros
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1.4fr)_repeat(4,minmax(8rem,1fr))]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Label htmlFor="asset-search" className="sr-only">
            Buscar ativo
          </Label>
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
            aria-hidden="true"
          />
          <Input
            id="asset-search"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Buscar por nome"
            className="pl-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-location" className="sr-only">
            Localização
          </Label>
          <Select
            value={filters.location || "all"}
            onValueChange={(value) => onChange("location", value === "all" ? "" : value)}
          >
            <SelectTrigger id="filter-location">
              <SelectValue placeholder="Localização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as localizações</SelectItem>
              {ASSET_LOCATIONS.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-category" className="sr-only">
            Tipo de ativo
          </Label>
          <Select
            value={filters.category || "all"}
            onValueChange={(value) => onChange("category", value === "all" ? "" : value)}
          >
            <SelectTrigger id="filter-category">
              <SelectValue placeholder="Tipo de ativo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {ASSET_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-status" className="sr-only">
            Estado
          </Label>
          <Select
            value={filters.status || "all"}
            onValueChange={(value) => onChange("status", value === "all" ? "" : value)}
          >
            <SelectTrigger id="filter-status">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {ASSET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="filter-period" className="sr-only">
            Período
          </Label>
          <Select value={filters.period} onValueChange={(value) => onChange("period", value)}>
            <SelectTrigger id="filter-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {active && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"
          aria-label="Filtros ativos"
        >
          <span className="text-xs text-text-muted">Ativos:</span>
          {filters.search && <Badge variant="neutral">Busca: {filters.search}</Badge>}
          {filters.location && <Badge variant="neutral">Local: {filters.location}</Badge>}
          {filters.category && <Badge variant="neutral">Tipo: {filters.category}</Badge>}
          {filters.status && <Badge variant="neutral">Estado: {filters.status}</Badge>}
          {filters.period !== "all" && (
            <Badge variant="neutral">Período: {filters.period} dias</Badge>
          )}
        </div>
      )}
    </section>
  );
}

function LoadingContent() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando ativos">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[8.1rem] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[7.5rem] rounded-lg" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface p-4">
        <div className="mb-5 flex gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorContent({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-error/30 bg-error-bg p-8 text-center" role="alert">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-error shadow-xs">
        <Warning size={22} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-error-fg">
        Não foi possível carregar os ativos.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-error-fg opacity-80">
        Verifique sua conexão ou tente novamente. Nenhuma alteração local foi perdida.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5 border-error/40 text-error-fg hover:border-error hover:bg-surface"
        onClick={onRetry}
      >
        <ArrowsClockwise size={16} aria-hidden="true" />
        Tentar novamente
      </Button>
    </div>
  );
}

function EmptyContent({
  filtered,
  onClear,
  onAdd,
}: {
  filtered: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center shadow-xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Buildings size={22} aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-text">
        {filtered ? "Nenhum ativo corresponde aos filtros" : "Nenhum ativo cadastrado"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-muted">
        {filtered
          ? "Tente remover um filtro ou pesquisar por outro termo."
          : "Adicione o primeiro ativo para começar a acompanhar localização, estado e custos."}
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Button type="button" onClick={filtered ? onClear : onAdd}>
          {filtered ? (
            <>
              <X size={16} aria-hidden="true" /> Limpar filtros
            </>
          ) : (
            <>
              <Plus size={16} aria-hidden="true" /> Adicionar ativo
            </>
          )}
        </Button>
        {filtered && (
          <Button type="button" variant="outline" onClick={onAdd}>
            Adicionar ativo
          </Button>
        )}
      </div>
    </div>
  );
}

export function AssetsValidationWorkspace() {
  const { resolvedTheme, setTheme } = useTheme();
  const [scenario, setScenario] = React.useState<ValidationScenario>("default");
  const [banner, setBanner] = React.useState<BannerVariant>("info");
  const [bannerDismissed, setBannerDismissed] = React.useState(false);
  const [tableStrategy, setTableStrategy] = React.useState<MobileTableStrategy>("priority");
  const [filters, setFilters] = React.useState<FilterValues>(EMPTY_FILTERS);
  const [assets, setAssets] = React.useState<Asset[]>(ASSET_FIXTURES);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const detailsTriggerRef = React.useRef<HTMLElement | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
  const [formRevision, setFormRevision] = React.useState(0);
  const [archiveAsset, setArchiveAsset] = React.useState<Asset | null>(null);

  const visibleAssets = React.useMemo(() => {
    const filtered = assets.filter((asset) => {
      if (
        filters.search &&
        !asset.name.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase())
      )
        return false;
      if (filters.location && asset.location !== filters.location) return false;
      if (filters.category && asset.category !== filters.category) return false;
      if (filters.status && asset.status !== filters.status) return false;
      return true;
    });
    if (scenario === "empty-natural") return [];
    return filtered;
  }, [assets, filters, scenario]);

  function handleScenarioChange(next: ValidationScenario) {
    setScenario(next);
    setBannerDismissed(false);
    if (next === "filters-active") {
      setFilters({ ...EMPTY_FILTERS, location: "Unidade Centro" });
    } else if (next === "filters-many") {
      setFilters({
        ...EMPTY_FILTERS,
        location: "Unidade Centro",
        category: "Dispositivo",
        status: "Operacional",
      });
    } else if (next === "empty-filtered") {
      setFilters({ ...EMPTY_FILTERS, location: "Garagem Sul", category: "Máquina" });
    } else if (
      next === "empty-natural" ||
      next === "default" ||
      next === "loading" ||
      next === "error"
    ) {
      setFilters(EMPTY_FILTERS);
    }
  }

  function handleBannerChange(next: BannerVariant) {
    setBanner(next);
    setBannerDismissed(false);
  }

  function handleFilterChange(field: keyof FilterValues, value: string) {
    setScenario("default");
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function resetFilters() {
    setScenario("default");
    setFilters(EMPTY_FILTERS);
  }

  function openDetails(asset: Asset) {
    detailsTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedAsset(asset);
    setDetailsOpen(true);
  }

  function handleDetailsOpenChange(open: boolean) {
    setDetailsOpen(open);
    if (!open) {
      requestAnimationFrame(() => detailsTriggerRef.current?.focus());
    }
  }

  function openCreate(asset: Asset | null = null) {
    setEditingAsset(asset);
    setFormRevision((current) => current + 1);
    setFormOpen(true);
  }

  function openArchive(asset: Asset) {
    setArchiveAsset(asset);
  }

  function confirmArchive() {
    if (!archiveAsset) return;
    setAssets((current) => current.filter((asset) => asset.id !== archiveAsset.id));
    setDetailsOpen(false);
    toast.success("Ativo arquivado.", {
      description: `${archiveAsset.name} saiu da lista operacional.`,
    });
    setArchiveAsset(null);
  }

  function handleSaved(nextAsset: Asset, editing: boolean) {
    setAssets((current) =>
      editing
        ? current.map((asset) => (asset.id === nextAsset.id ? nextAsset : asset))
        : [nextAsset, ...current],
    );
    toast.success(editing ? "Alterações salvas." : "Ativo adicionado com sucesso.");
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="flex min-h-screen">
        <aside className={cnSidebar(sidebarCollapsed)}>
          <ValidationSidebar collapsed={sidebarCollapsed} />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Abrir navegação"
              >
                <List size={19} aria-hidden="true" />
              </Button>
              <div className="hidden items-center gap-2 text-sm text-text-muted sm:flex">
                <Buildings size={17} aria-hidden="true" />
                <span className="truncate">Unidade Centro</span>
              </div>
              <div className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
              <span className="truncate text-sm font-medium text-text">Operações Gerais</span>
            </div>
            <div className="hidden min-w-0 flex-1 justify-center md:flex">
              <div className="relative w-full max-w-sm">
                <Label htmlFor="global-search" className="sr-only">
                  Busca global
                </Label>
                <MagnifyingGlass
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
                  aria-hidden="true"
                />
                <Input
                  id="global-search"
                  placeholder="Busca global"
                  className="h-9 bg-surface pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Notificações"
                title="Notificações"
              >
                <Bell size={18} aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label={`Tema: ${resolvedTheme === "dark" ? "dark" : "light"}. Alternar tema`}
                aria-pressed={resolvedTheme === "dark"}
                title="Alternar tema"
              >
                {resolvedTheme === "dark" ? (
                  <Moon size={18} aria-hidden="true" />
                ) : (
                  <Sun size={18} aria-hidden="true" />
                )}
              </Button>
              <div
                className="ml-1 hidden h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent sm:flex"
                aria-label="Usuário Operações"
              >
                OP
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
            <div className="space-y-6">
              <ValidationLabControls
                scenario={scenario}
                banner={banner}
                tableStrategy={tableStrategy}
                onScenarioChange={handleScenarioChange}
                onBannerChange={handleBannerChange}
                onTableStrategyChange={setTableStrategy}
              />

              <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="mb-2 text-xs font-medium tracking-[0.14em] text-text-subtle uppercase">
                    Ativos / Visão geral
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
                    Central de Ativos
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                    Acompanhe localização, estado e custos dos ativos da organização.
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => openCreate()}
                >
                  <Plus size={18} aria-hidden="true" />
                  Adicionar ativo
                </Button>
              </section>

              {scenario === "loading" ? (
                <LoadingContent />
              ) : (
                <>
                  <Metrics />
                  <StatusBanner
                    variant={banner}
                    dismissed={bannerDismissed}
                    onDismiss={() => setBannerDismissed(true)}
                  />
                  <FilterBar
                    filters={filters}
                    onChange={handleFilterChange}
                    onReset={resetFilters}
                  />
                  <section aria-labelledby="assets-list-title" className="space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h2 id="assets-list-title" className="text-sm font-semibold text-text">
                          Todos os ativos
                        </h2>
                        <p className="mt-1 text-xs text-text-muted">
                          {visibleAssets.length} registros visíveis · clique em um ativo para abrir
                          o detalhe.
                        </p>
                      </div>
                      {hasFilters(filters) && <Badge variant="neutral">Filtros aplicados</Badge>}
                    </div>
                    {scenario === "error" ? (
                      <ErrorContent onRetry={() => handleScenarioChange("default")} />
                    ) : visibleAssets.length === 0 ? (
                      <EmptyContent
                        filtered={hasFilters(filters)}
                        onClear={resetFilters}
                        onAdd={() => openCreate()}
                      />
                    ) : (
                      <AssetTable
                        assets={visibleAssets}
                        strategy={tableStrategy}
                        onOpen={openDetails}
                        onArchive={openArchive}
                      />
                    )}
                  </section>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(18rem,86vw)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegação da Central de Ativos</SheetTitle>
            <SheetDescription>Áreas do laboratório visual.</SheetDescription>
          </SheetHeader>
          <ValidationSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <AssetDetailsSheet
        asset={selectedAsset}
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        onEdit={(asset) => {
          setDetailsOpen(false);
          openCreate(asset);
        }}
        onArchive={openArchive}
      />

      <AssetFormSheet
        key={`${editingAsset?.id ?? "new"}-${formRevision}`}
        open={formOpen}
        asset={editingAsset}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
      />

      <ArchiveDialog
        asset={archiveAsset}
        onCancel={() => setArchiveAsset(null)}
        onConfirm={confirmArchive}
      />

      <div className="fixed bottom-3 left-3 z-20 hidden md:block">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setSidebarCollapsed((current) => !current)}
          aria-label={sidebarCollapsed ? "Expandir navegação" : "Recolher navegação"}
          title={sidebarCollapsed ? "Expandir navegação" : "Recolher navegação"}
        >
          {sidebarCollapsed ? (
            <CaretDoubleRight size={17} aria-hidden="true" />
          ) : (
            <CaretDoubleLeft size={17} aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}

function cnSidebar(collapsed: boolean) {
  return `hidden shrink-0 border-r border-border bg-surface transition-[width] duration-base md:block ${collapsed ? "w-16" : "w-60"}`;
}

function ArchiveDialog({
  asset,
  onCancel,
  onConfirm,
}: {
  asset: Asset | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={asset !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-bg text-error">
              <Archive size={18} aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Arquivar este ativo?</DialogTitle>
              <DialogDescription className="mt-2">
                O ativo será removido da lista operacional e deixará de aparecer como disponível
                para novas operações. O histórico existente será preservado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Arquivar ativo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
