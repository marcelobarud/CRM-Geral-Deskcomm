import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { CardInput } from "@/lib/kanban/card-state";
import type { Lead } from "@/lib/types/leads";
import { KanbanCard } from "./KanbanCard";

vi.mock("@hello-pangea/dnd", () => ({
  Draggable: ({ children }: { children: (provided: object, snapshot: object) => ReactNode }) =>
    children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));
vi.mock("./KanbanCardActions", () => ({
  KanbanCardActions: () => createPortal(<button>Confirmar perda fictícia</button>, document.body),
}));
vi.mock("./OwnerBadge", () => ({ OwnerBadge: () => null }));
vi.mock("./ConversaSlot", () => ({ ConversaSlot: () => null }));
vi.mock("./NextActionSlot", () => ({ NextActionSlot: () => null }));
vi.mock("./ReactivationSlot", () => ({ ReactivationSlot: () => null }));
vi.mock("./ScoreSlot", () => ({ ScoreSlot: () => null }));

it("clique no diálogo em portal não abre o dossiê; clique no card continua abrindo", () => {
  const open = vi.fn();
  const select = vi.fn();
  const card: CardInput = {
    id: "lead", title: "Negociação fictícia", valueCents: 123456, currency: "BRL",
    owner: { kind: null, name: null, agentVersion: null }, stageName: "Negociação",
    hoursInStage: null, isCooling: false, tags: [],
  };
  render(<KanbanCard card={card} lead={{ id: "lead" } as Lead} index={0}
    pipelineId="pipeline" onOpen={open} onSelect={select} />);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar perda fictícia" }));
  expect(open).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("group", { name: "Lead: Negociação fictícia" }));
  expect(open).toHaveBeenCalledExactlyOnceWith("lead");
  fireEvent.click(screen.getByRole("group", { name: "Lead: Negociação fictícia" }), { ctrlKey: true });
  expect(select).toHaveBeenCalledExactlyOnceWith("lead", "alterna");
  expect(open).toHaveBeenCalledTimes(1);
});
