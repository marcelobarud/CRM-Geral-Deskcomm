import { readFileSync } from "node:fs";
import ts from "typescript";
import { expect, it } from "vitest";

it("a limpeza não substitui o diagnóstico sanitizado da falha original", () => {
  const source = ts.createSourceFile(
    "verify-geral-1.mjs",
    readFileSync("scripts/supabase/verify-geral-1.mjs", "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const guards = source.statements
    .filter((node) => ts.isFunctionDeclaration(node) && ["requireResult", "insist"].includes(node.name?.text ?? ""))
    .map((node) => node.getText(source))
    .join("\n");
  const result = new Function(`
    let lastCheck = 'preflight', failureCode = null, failureReason = null;
    ${guards}
    let original;
    try { requireResult({error:{code:'42501',message:'permission denied'}},'F empresa'); }
    catch (error) { original = error; }
    requireResult({data:[]},'F inventário cleanup PDF');
    return {failure:original.verificationFailure,current:lastCheck};
  `)();
  expect(result.current).toBe("F inventário cleanup PDF");
  expect(result.failure).toEqual({ check: "F empresa", code: "42501", reason: "unclassified" });
});
