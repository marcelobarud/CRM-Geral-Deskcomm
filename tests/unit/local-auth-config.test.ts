import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  env: { LOCAL_DEV_AUTH: false, NODE_ENV: "development" },
  localAuthConfig: vi.fn(() => ({ email: "fixture@example.com", password: "" })),
}));

vi.mock("@/lib/env", () => ({ env: state.env }));
vi.mock("@/lib/local-dev/auth", () => ({
  localAuthConfig: state.localAuthConfig,
  bearerToken: vi.fn(),
  localClaimsFromRequest: vi.fn(),
}));

import { authConfigOrResponse } from "@/lib/local-dev/http";

describe("configuração da autenticação local", () => {
  beforeEach(() => {
    state.env.LOCAL_DEV_AUTH = false;
    state.env.NODE_ENV = "development";
    state.localAuthConfig.mockClear();
  });

  it.each([
    [false, "development"],
    [true, "production"],
  ] as const)(
    "retorna 404 com local=%s e ambiente=%s sem carregar credenciais",
    async (enabled, mode) => {
      state.env.LOCAL_DEV_AUTH = enabled;
      state.env.NODE_ENV = mode;
      const result = authConfigOrResponse() as Response;
      expect(result.status).toBe(404);
      expect(await result.json()).toEqual({ error: "Local runtime desabilitado." });
      expect(state.localAuthConfig).not.toHaveBeenCalled();
    },
  );

  it("mantém 503 para senha ausente quando o runtime local está habilitado", () => {
    state.env.LOCAL_DEV_AUTH = true;
    const result = authConfigOrResponse() as Response;
    expect(result.status).toBe(503);
    expect(state.localAuthConfig).toHaveBeenCalledOnce();
  });
});
