import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { OpportunityTasks } from "./OpportunityTasks";
const state = vi.hoisted(() => ({ write: true, failed: false, edit: vi.fn(), retry: vi.fn() }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => state.write }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/tasks/useTasks", () => ({
  useTasks: () => ({
    tarefas: [{ id: "task", title: "Retornar", status: "pending" }],
    falhou: state.failed,
    recarregar: state.retry,
    editarTarefa: state.edit,
  }),
}));
vi.mock("@/app/app/tasks/_components/FormularioDeTarefa", () => ({
  FormularioDeTarefa: () => null,
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.write = true;
  state.failed = false;
});
it("oportunidade sem contato oferece próximo passo humano; viewer não recebe ação", () => {
  const { rerender } = render(<OpportunityTasks leadId="lead" />);
  expect(screen.getByRole("button", { name: "Nova tarefa" })).toBeEnabled();
  state.write = false;
  rerender(<OpportunityTasks leadId="lead" />);
  expect(screen.queryByRole("button", { name: "Nova tarefa" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Concluir tarefa" })).not.toBeInTheDocument();
});
it("erro de leitura oferece recuperação e não afirma que a lista está vazia", () => {
  state.failed = true;
  render(<OpportunityTasks leadId="lead" />);
  expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(state.retry).toHaveBeenCalledOnce();
  expect(screen.queryByText("Nenhuma tarefa vinculada.")).not.toBeInTheDocument();
});
it("erro de conclusão não perde a tarefa nem deixa a ação bloqueada", async () => {
  state.edit.mockRejectedValue(new Error("private"));
  render(<OpportunityTasks leadId="lead" />);
  fireEvent.click(screen.getByRole("button", { name: "Concluir tarefa" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível concluir"),
  );
  expect(screen.getByText(/Retornar/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Concluir tarefa" })).toBeEnabled();
});
