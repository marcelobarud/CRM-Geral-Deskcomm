export type AssetStatus = "Operacional" | "Em manutenção" | "Atenção" | "Inativo";

export type Asset = {
  id: string;
  name: string;
  category: string;
  location: string;
  status: AssetStatus;
  lastInspection: string | null;
  acquisitionDate: string | null;
  costCents: number | null;
  notes: string | null;
};

export const ASSET_CATEGORIES = [
  "Computador",
  "Equipamento",
  "Veículo",
  "Dispositivo",
  "Máquina",
  "Ferramenta",
] as const;

export const ASSET_LOCATIONS = [
  "Unidade Centro",
  "Fábrica Norte",
  "Garagem Sul",
  "Oficina Leste",
] as const;

export const ASSET_STATUSES: AssetStatus[] = ["Operacional", "Em manutenção", "Atenção", "Inativo"];

export const ASSET_FIXTURES: Asset[] = [
  {
    id: "asset-001",
    name: "Notebook Dell Latitude 7450",
    category: "Computador",
    location: "Unidade Centro",
    status: "Operacional",
    lastInspection: "2026-09-12",
    acquisitionDate: "2026-02-18",
    costCents: 849000,
    notes: "Uso administrativo.",
  },
  {
    id: "asset-002",
    name: "Compressor Industrial 03",
    category: "Equipamento",
    location: "Fábrica Norte",
    status: "Em manutenção",
    lastInspection: "2026-09-08",
    acquisitionDate: "2024-07-04",
    costCents: 3280000,
    notes: "Revisão do sistema de ar.",
  },
  {
    id: "asset-003",
    name: "Van Operacional 07",
    category: "Veículo",
    location: "Garagem Sul",
    status: "Atenção",
    lastInspection: "2026-08-29",
    acquisitionDate: "2023-11-15",
    costCents: 11800000,
    notes: "Inspeção de pneus pendente.",
  },
  {
    id: "asset-004",
    name: "Scanner Zebra TC58",
    category: "Dispositivo",
    location: "Unidade Centro",
    status: "Operacional",
    lastInspection: "2026-09-11",
    acquisitionDate: "2026-04-23",
    costCents: 428000,
    notes: null,
  },
  {
    id: "asset-005",
    name: "Torno CNC Haas VF-2",
    category: "Máquina",
    location: "Fábrica Norte",
    status: "Inativo",
    lastInspection: null,
    acquisitionDate: "2021-03-10",
    costCents: 28650000,
    notes: "Aguardando decisão de uso.",
  },
  {
    id: "asset-006",
    name: "Kit de ferramentas de manutenção preventiva com identificação longa",
    category: "Ferramenta",
    location: "Oficina Leste",
    status: "Operacional",
    lastInspection: "2026-09-05",
    acquisitionDate: "2025-09-01",
    costCents: 216000,
    notes: "Nome propositalmente longo para testar truncamento acessível.",
  },
];

export function formatCurrency(cents: number | null): string {
  if (cents === null) return "Não informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(date: string | null): string {
  if (!date) return "Não informada";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function getStatusVariant(status: AssetStatus): "neutral" | "info" | "warning" | "error" {
  switch (status) {
    case "Em manutenção":
      return "info";
    case "Atenção":
      return "warning";
    case "Inativo":
      return "neutral";
    case "Operacional":
    default:
      return "neutral";
  }
}
