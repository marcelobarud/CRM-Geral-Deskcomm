"use client";

import * as React from "react";
import { CheckCircle } from "@/lib/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ASSET_CATEGORIES, ASSET_LOCATIONS, type Asset } from "../_data/fixtures";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssetFormSheetProps = {
  open: boolean;
  asset: Asset | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (asset: Asset, editing: boolean) => void;
};

type FormValues = {
  name: string;
  category: string;
  location: string;
  acquisitionDate: string;
  cost: string;
  notes: string;
  noCost: boolean;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

function initialValues(asset: Asset | null): FormValues {
  return {
    name: asset?.name ?? "",
    category: asset?.category ?? "",
    location: asset?.location ?? "",
    acquisitionDate: asset?.acquisitionDate ?? "",
    cost:
      asset?.costCents === null || asset?.costCents === undefined
        ? ""
        : String(asset.costCents / 100),
    notes: asset?.notes ?? "",
    noCost: asset?.costCents === null,
  };
}

function fieldError(errors: FormErrors, field: keyof FormValues) {
  return errors[field] ? (
    <p id={`${field}-error`} className="text-xs text-error" role="alert">
      {errors[field]}
    </p>
  ) : null;
}

export function AssetFormSheet({ open, asset, onOpenChange, onSaved }: AssetFormSheetProps) {
  const editing = asset !== null;
  const [values, setValues] = React.useState(initialValues(asset));
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Informe o nome do ativo.";
    if (!values.category) next.category = "Escolha uma categoria.";
    if (!values.location) next.location = "Escolha uma localização.";
    if (!values.noCost && values.cost && Number.isNaN(Number(values.cost.replace(",", ".")))) {
      next.cost = "Informe um custo numérico válido.";
    }
    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    window.setTimeout(() => {
      const nextAsset: Asset = {
        id: asset?.id ?? `asset-new-${Date.now()}`,
        name: values.name.trim(),
        category: values.category,
        location: values.location,
        status: asset?.status ?? "Operacional",
        lastInspection: asset?.lastInspection ?? null,
        acquisitionDate: values.acquisitionDate || null,
        costCents:
          values.noCost || !values.cost
            ? null
            : Math.round(Number(values.cost.replace(",", ".")) * 100),
        notes: values.notes.trim() || null,
      };
      setSubmitting(false);
      onSaved(nextAsset, editing);
      onOpenChange(false);
    }, 650);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-y-auto p-5 sm:w-[min(94vw,36rem)] sm:p-6"
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{editing ? "Editar ativo" : "Adicionar ativo"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Atualize os dados do ativo selecionado."
              : "Registre um ativo para testar o fluxo de criação."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col" noValidate>
          <div className="flex-1 space-y-6 overflow-y-auto py-6">
            <section className="space-y-4" aria-labelledby="asset-identification-title">
              <div>
                <h2 id="asset-identification-title" className="text-sm font-semibold text-text">
                  Identificação
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Use informações que permitam localizar o ativo rapidamente.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-name">
                  Nome{" "}
                  <span className="text-error" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Input
                  id="asset-name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : "asset-name-help"}
                />
                <p id="asset-name-help" className="text-xs text-text-muted">
                  Nome curto e reconhecível para a lista.
                </p>
                {fieldError(errors, "name")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-category">
                  Categoria{" "}
                  <span className="text-error" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Select
                  value={values.category}
                  onValueChange={(value) => update("category", value)}
                >
                  <SelectTrigger
                    id="asset-category"
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={errors.category ? "category-error" : undefined}
                  >
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError(errors, "category")}
              </div>
            </section>

            <section
              className="space-y-4 border-t border-border pt-6"
              aria-labelledby="asset-cycle-title"
            >
              <div>
                <h2 id="asset-cycle-title" className="text-sm font-semibold text-text">
                  Localização e ciclo
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Contexto físico e data de referência do registro.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-location">
                  Localização{" "}
                  <span className="text-error" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Select
                  value={values.location}
                  onValueChange={(value) => update("location", value)}
                >
                  <SelectTrigger
                    id="asset-location"
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? "location-error" : undefined}
                  >
                    <SelectValue placeholder="Selecione uma localização" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_LOCATIONS.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError(errors, "location")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-acquisition-date">Data de aquisição</Label>
                <Input
                  id="asset-acquisition-date"
                  type="date"
                  value={values.acquisitionDate}
                  onChange={(event) => update("acquisitionDate", event.target.value)}
                />
                <p className="text-xs text-text-muted">
                  Campo opcional para testar um valor date-like.
                </p>
              </div>
            </section>

            <section
              className="space-y-4 border-t border-border pt-6"
              aria-labelledby="asset-value-title"
            >
              <div>
                <h2 id="asset-value-title" className="text-sm font-semibold text-text">
                  Valor e observações
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Adicione contexto sem tornar o custo obrigatório.
                </p>
              </div>
              <div className="bg-surface-muted flex items-center justify-between gap-4 rounded-md p-3">
                <div>
                  <Label htmlFor="asset-no-cost" className="leading-normal">
                    Não informar custo
                  </Label>
                  <p className="mt-1 text-xs text-text-muted">
                    Desabilita o campo de custo para testar esse estado.
                  </p>
                </div>
                <Switch
                  id="asset-no-cost"
                  checked={values.noCost}
                  onCheckedChange={(checked) => update("noCost", checked)}
                  aria-label="Não informar custo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-cost">Custo</Label>
                <Input
                  id="asset-cost"
                  inputMode="decimal"
                  placeholder="Ex.: 8490"
                  value={values.cost}
                  disabled={values.noCost}
                  onChange={(event) => update("cost", event.target.value)}
                  aria-invalid={Boolean(errors.cost)}
                  aria-describedby={errors.cost ? "cost-error" : undefined}
                />
                {fieldError(errors, "cost")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-notes">Observações</Label>
                <Textarea
                  id="asset-notes"
                  value={values.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  placeholder="Contexto opcional sobre o ativo"
                />
              </div>
            </section>
          </div>

          <SheetFooter className="gap-2 border-t border-border pt-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                "Salvando..."
              ) : editing ? (
                <>
                  <CheckCircle size={16} aria-hidden="true" /> Salvar alterações
                </>
              ) : (
                "Adicionar ativo"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
