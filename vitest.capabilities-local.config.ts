import { defineConfig } from "vitest/config";
import base from "./vitest.config";

/** PostgreSQL nativo temporário; a mesma suíte integra o harness test:db. */
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    environment: "node",
    include: ["tests/invariants/capabilities-local.test.ts"],
    exclude: [],
  },
});
