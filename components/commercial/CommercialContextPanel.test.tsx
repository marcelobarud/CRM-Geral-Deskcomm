import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommercialContextPanel } from "./CommercialContextPanel";

const state = vi.hoisted(() => ({
  writable: true,
  pipelineError: false,
  result: {} as Record<string, unknown>,
  retry: vi.fn(),
  edit: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => state.result,
  useQueryClient: () => ({ invalidateQueries: state.invalidate }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org" } }),
  usePermission: () => state.writable,
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/pipelines/useDefaultPipeline", () => ({
  useDefaultPipeline: () => ({ data: undefined, isError: state.pipelineError }),
}));
vi.mock("@/hooks/tasks/useTasks", () => ({ useTasks: () => ({ editarTarefa: state.edit }) }));
vi.mock("@/components/kanban/NewLeadDialog", () => ({ NewLeadDialog: () => null }));
vi.mock("@/app/app/tasks/_components/FormularioDeTarefa", () => ({
  FormularioDeTarefa: () => null,
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.writable = true;
  state.pipelineError = false;
  state.result = { data: { leads: [], tasks: [], appointments: [] }, refetch: state.retry };
});
describe("Contexto comercial visível", () => {
  it("distingue erro de leitura de relacionamento vazio e oferece recuperação", () => {
    state.result = { isError: true, refetch: state.retry };
    render(<CommercialContextPanel contactId="contact" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.queryByText(/Sem oportunidade/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(state.retry).toHaveBeenCalledOnce();
  });
  it("permite próximo passo humano antes de criar oportunidade", () => {
    render(<CommercialContextPanel contactId="contact" />);
    expect(screen.getByText(/Sem oportunidade/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Nova tarefa" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Agendar compromisso" })).toHaveAttribute(
      "href",
      "/app/agenda?contato=contact",
    );
  });
  it("viewer e contato anonimizado têm somente leitura", () => {
    state.writable = false;
    state.pipelineError = true;
    const { rerender } = render(<CommercialContextPanel contactId="contact" />);
    expect(screen.queryByRole("button", { name: "Nova tarefa" })).not.toBeInTheDocument();
    expect(screen.queryByText("Não foi possível carregar o funil padrão.")).not.toBeInTheDocument();
    state.writable = true;
    rerender(<CommercialContextPanel contactId="contact" allowActions={false} />);
    expect(screen.queryByRole("button", { name: "Nova tarefa" })).not.toBeInTheDocument();
    expect(screen.queryByText("Não foi possível carregar o funil padrão.")).not.toBeInTheDocument();
    rerender(<CommercialContextPanel contactId="contact" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o funil padrão.");
  });
  it("falha ao concluir continua visível e permite nova tentativa", async () => {
    state.result = {
      data: {
        leads: [],
        appointments: [],
        tasks: [{ id: "task", title: "Retornar", status: "in_progress", due_date: null }],
      },
    };
    state.edit.mockRejectedValue(new Error("Private database detail"));
    render(<CommercialContextPanel contactId="contact" />);
    expect(screen.getByText(/Retornar.*Em andamento/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Concluir tarefa" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível concluir"),
    );
    expect(screen.getByRole("button", { name: "Concluir tarefa" })).toBeEnabled();
    expect(screen.queryByText("Private database detail")).not.toBeInTheDocument();
  });
});
