import { expect, it } from "vitest";
import { commercialValuesByCurrency } from "./value";
it("totaliza em unidades menores, preservando centavos e cada moeda", () => {
  expect(
    commercialValuesByCurrency([
      { value_cents: 123456, currency: "BRL" },
      { value_cents: 44, currency: "BRL" },
      { value_cents: 500, currency: "USD" },
    ]),
  ).toEqual(
    new Map([
      ["BRL", 123500],
      ["USD", 500],
    ]),
  );
});
it("valor ausente não vira valor de uma moeda; zero é preservado", () => {
  expect(
    commercialValuesByCurrency([
      { value_cents: null, currency: "USD" },
      { value_cents: 0, currency: "BRL" },
    ]),
  ).toEqual(new Map([["BRL", 0]]));
});
