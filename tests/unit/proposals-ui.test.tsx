import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const state = vi.hoisted(() => ({ role: "admin", enabled: false, populated: false }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org-fictícia", role: state.role } }),
}));
vi.mock("@/hooks/capabilities/CapabilitiesProvider", () => ({
  useCapability: () => ({ can_execute: state.enabled, reason: "Desativada" }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: async (path: string) =>
      path.endsWith("/options")
        ? { data: { leads: [], contacts: [], products: [] } }
        : { data: state.populated && path.startsWith('/api/v1/proposals?') ? [{id:'fictícia',title:'Proposta salva',currency:'BRL',status:'draft',updated_at:'2026-10-03T12:00:00Z',crm_proposal_items:[{description:'Serviço fictício',quantity:2,unit_price_cents:10000}],crm_proposal_versions:[]}] : [], meta: { has_more: false } },
  },
}));
import { ProposalsWorkspace } from "@/components/proposals/ProposalsWorkspace";
const mount = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProposalsWorkspace />
    </QueryClientProvider>,
  );
describe("propostas UI", () => {
  beforeEach(() => {
    state.role = "admin";
    state.enabled = false;
    state.populated = false;
  });
  it("lista preenchida renderiza a proposta e o total dos itens", async () => {
    state.populated = true;
    mount();
    expect(await screen.findByRole('button',{name:'Proposta salva'})).toBeInTheDocument();
    expect(screen.getByText(/200,00/)).toBeInTheDocument();
  });
  it("viewer recebe permissão explícita", () => {
    state.role = "viewer";
    mount();
    expect(screen.getByText("Sem permissão para propostas.")).toBeInTheDocument();
  });
  it("desligada mantém leitura e retira novos efeitos", async () => {
    mount();
    expect(
      screen.getByText("Histórico preservado. Novas ações estão bloqueadas."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nova proposta" })).not.toBeInTheDocument();
    expect(await screen.findByText("Nenhuma proposta encontrada.")).toBeInTheDocument();
  });
  it("itens têm labels e remoção contextual acessível", async () => {
    state.enabled = true;
    mount();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Nova proposta" }));
    expect(screen.getByRole("form", { name: "Rascunho da proposta" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Adicionar item" }));
    expect(screen.getAllByLabelText(/Quantidade/)).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Remover item · 2" }));
    expect(screen.getAllByLabelText(/Quantidade/)).toHaveLength(1);
  });
});
