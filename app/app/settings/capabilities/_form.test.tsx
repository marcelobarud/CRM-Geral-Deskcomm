import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCapability } from "@/lib/capabilities/registry";
const snapshot = vi.hoisted(() => ({ model: null as unknown }));
vi.mock("@/hooks/capabilities/CapabilitiesProvider", () => ({
  useCapabilities: () => snapshot.model,
  capabilityQueryKey: (org: string) => ["capabilities", org],
}));
import { CapabilitiesForm } from "./_form";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function show({
  enabled = true,
  manage = true,
  role = "admin",
  configured = true,
}: { enabled?: boolean; manage?: boolean; role?: "admin" | "viewer"; configured?: boolean } = {}) {
  snapshot.model = {
    organization_id: "A",
    can_manage: manage,
    capabilities: [
      resolveCapability(
        "message_templates",
        { capabilities: { version: 1, revision: 1, overrides: { message_templates: enabled } } },
        role,
        { configured, healthy: true },
      ),
    ],
  };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CapabilitiesForm />
    </QueryClientProvider>,
  );
}
describe("administração de capacidades", () => {
  it("falha de leitura inicial mostra erro e caminho de atualização", () => {
    snapshot.model = { organization_id: "A", can_manage: false, capabilities: [], error: "Não foi possível atualizar a configuração." };
    render(<QueryClientProvider client={new QueryClient()}><CapabilitiesForm /></QueryClientProvider>);
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível atualizar");
    expect(screen.getByRole("button", { name: "Atualizar disponibilidade" })).toBeTruthy();
  });
  it("desativada conserva controle e motivo, sem apresentar pronto", () => {
    show({ enabled: false });
    expect(screen.getByText("Desativado")).toBeTruthy();
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(/dados existentes foram preservados/i)).toBeTruthy();
  });
  it("não configurada é diferente de falta de permissão", () => {
    show({ configured: false });
    expect(screen.getByText("Habilitado, falta configurar")).toBeTruthy();
    cleanup();
    show({ role: "viewer", manage: false });
    expect(screen.getByText("Pronto")).toBeTruthy();
    expect(screen.getByText(/Seu papel não permite/)).toBeTruthy();
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
  });
  it("teclado/foco operam switch com PATCH sem organização no body", async () => {
    show();
    const request = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", request);
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("switch"));
    await user.keyboard(" ");
    expect(request).toHaveBeenCalledWith(
      "/api/v1/settings/capabilities",
      expect.objectContaining({
        body: JSON.stringify({ capability: "message_templates", enabled: false }),
      }),
    );
  });
});
