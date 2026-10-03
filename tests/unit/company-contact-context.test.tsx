import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  role: "viewer",
  pending: false,
  error: false,
  mutate: vi.fn(),
  retry: vi.fn(),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { role: state.role }, user: { support: null } }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/companies/useCompanies", () => ({
  useCompanies: () => ({
    isPending: state.pending,
    isError: state.error,
    refetch: state.retry,
    data: {
      contact_company_id: "company",
      companies: [
        { id: "company", name: "Empresa A" },
        { id: "other", name: "Empresa B" },
      ],
    },
  }),
  useCompanyCommand: () => ({ mutate: state.mutate, isPending: false, isError: false }),
}));
import { CompanyContactContext } from "@/components/companies/CompanyContactContext";
beforeEach(() => {
  vi.clearAllMocks();
  state.role = "viewer";
  state.pending = false;
  state.error = false;
});
describe("Contexto empresarial visível", () => {
  it("viewer lê empresa sem controles de vínculo", () => {
    render(<CompanyContactContext contactId="contact" editable />);
    expect(screen.getByRole("link", { name: "Empresa A" })).toHaveAttribute(
      "href",
      "/app/companies/company",
    );
    expect(screen.queryByRole("button", { name: "Remover vínculo" })).not.toBeInTheDocument();
  });
  it("agent troca vínculo e remove somente relação", () => {
    state.role = "agent";
    render(<CompanyContactContext contactId="contact" editable />);
    fireEvent.change(screen.getByLabelText("Selecionar empresa"), { target: { value: "other" } });
    fireEvent.click(screen.getByRole("button", { name: "Vincular empresa" }));
    expect(state.mutate).toHaveBeenCalledWith({
      action: "link",
      contact_id: "contact",
      company_id: "other",
    });
    fireEvent.click(screen.getByRole("button", { name: "Remover vínculo" }));
    expect(state.mutate).toHaveBeenCalledWith({
      action: "link",
      contact_id: "contact",
      company_id: null,
    });
    expect(
      screen.queryByRole("button", { name: "Criar e vincular empresa" }),
    ).not.toBeInTheDocument();
  });
  it("contexto de oportunidade não oferece edição redundante", () => {
    state.role = "admin";
    render(<CompanyContactContext contactId="contact" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("erro oferece retry e não aparece como sem empresa", () => {
    state.error = true;
    render(<CompanyContactContext contactId="contact" />);
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByText("Nenhuma empresa vinculada.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(state.retry).toHaveBeenCalled();
  });
  it("loading tem estado próprio", () => {
    state.pending = true;
    render(<CompanyContactContext contactId="contact" />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando empresa");
  });
});
