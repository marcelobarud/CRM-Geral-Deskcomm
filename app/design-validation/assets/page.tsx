import type { Metadata } from "next";
import { AssetsValidationWorkspace } from "./_components/AssetsValidationWorkspace";

export const metadata: Metadata = {
  title: "Central de Ativos — validação visual",
  description: "Protótipo experimental para validar uma linguagem visual não-CRM.",
  robots: { index: false, follow: false },
};

export default function AssetsValidationPage() {
  return <AssetsValidationWorkspace />;
}
