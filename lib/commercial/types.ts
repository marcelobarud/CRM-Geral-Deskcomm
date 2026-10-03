import type { Database } from "@/lib/database.types";
import type { Tarefa } from "@/lib/tarefas/tipos";

type Tables = Database["public"]["Tables"];
export type CommercialLead = Pick<
  Tables["crm_leads"]["Row"],
  | "id"
  | "title"
  | "status"
  | "pipeline_id"
  | "stage_id"
  | "contact_id"
  | "owner_user_id"
  | "value_cents"
  | "currency"
  | "source"
  | "lost_reason"
  | "closed_at"
>;
export type CommercialAppointment = Pick<
  Tables["calendar_appointments"]["Row"],
  "id" | "title" | "starts_at" | "ends_at" | "time_zone" | "status" | "owner_user_id" | "contact_id"
>;
export interface CommercialContext {
  leads: CommercialLead[];
  tasks: Tarefa[];
  appointments: CommercialAppointment[];
}
