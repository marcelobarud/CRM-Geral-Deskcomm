"use client";

import * as React from "react";
import { Buildings, ChartBar, ClipboardText, Gear, Gauge, House } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

const NAV_ITEMS: Array<{ label: string; icon: React.ElementType; active?: boolean }> = [
  { label: "Visão geral", icon: House },
  { label: "Ativos", icon: Buildings, active: true },
  { label: "Operações", icon: Gauge },
  { label: "Relatórios", icon: ChartBar },
  { label: "Configurações", icon: Gear },
] as const;

export function ValidationSidebar({ collapsed = false, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "gap-3 px-4",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
          CA
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text">Central de Ativos</div>
            <div className="text-[11px] text-text-muted">Laboratório visual</div>
          </div>
        )}
      </div>

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto p-2">
        <div className="mb-2 px-3 pt-2 text-[11px] font-medium tracking-[0.12em] text-text-subtle uppercase">
          {!collapsed && "Workspace"}
        </div>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                aria-current={item.active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                onClick={item.active ? onNavigate : undefined}
                className={cn(
                  "flex h-10 w-full items-center rounded-md text-left text-sm transition-colors duration-fast",
                  collapsed ? "justify-center px-2" : "gap-3 px-3",
                  item.active
                    ? "bg-accent text-accent-foreground"
                    : "text-text-muted hover:bg-accent-soft hover:text-text",
                )}
              >
                <Icon size={18} weight={item.active ? "bold" : "regular"} aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-border p-3",
          collapsed ? "flex justify-center" : "",
        )}
      >
        {collapsed ? (
          <ClipboardText size={18} className="text-text-subtle" aria-label="Ajuda" />
        ) : (
          <div className="bg-surface-muted rounded-md p-3 text-xs leading-relaxed text-text-muted">
            <div className="mb-1 font-medium text-text">Ambiente de validação</div>
            <div>Dados fictícios, sem conexão com operações reais.</div>
          </div>
        )}
      </div>
    </div>
  );
}
