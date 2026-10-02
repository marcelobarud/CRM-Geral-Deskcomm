import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Exclusivo para banco temporário: nunca usa a conexão do app/seed de desenvolvimento.
const connectionString = process.env.HARDENING_TEST_DB_URL;
if (connectionString && new URL(connectionString).pathname !== "/crm_geral_hardening_test") {
  throw new Error("HARDENING_TEST_DB_URL deve apontar para crm_geral_hardening_test temporário");
}
// O harness Docker padrão usa outra base. Este complemento só roda quando solicitado.
describe.skipIf(!connectionString)("hardening em PostgreSQL temporário nativo", () => {
const pool = new Pool({ connectionString });
const orgA = randomUUID(), orgB = randomUUID();
const users: Record<string, string> = Object.fromEntries(["viewer", "agent", "manager", "admin"].map(role => [role, randomUUID()]));
const contactA = randomUUID(), contactB = randomUUID(), session = randomUUID(), conversation = randomUUID();
const pointer = randomUUID(), version = randomUUID(), enrollment = randomUUID(), event = randomUUID();
const checkpoint = randomUUID();
const otherPointer=randomUUID(),otherVersion=randomUUID(),otherEnrollment=randomUUID();
const spareVersion=randomUUID(),agent=randomUUID(),agentVersion=randomUUID();
const blockedContact=randomUUID(),blockedConversation=randomUUID();
beforeAll(async () => {
  const c = await pool.connect();
  try {
    await c.query("insert into organizations(id,legal_name,display_name,slug) values ($1,'ORG A fictícia','ORG A',$3),($2,'ORG B fictícia','ORG B',$4)", [orgA, orgB, orgA, orgB]);
    for (const [role, id] of Object.entries(users)) {
      await c.query("insert into auth.users(id,email) values($1,$2)", [id, `${role}.${id}@invariant.test`]);
      await c.query("insert into user_organizations(user_id,organization_id,role) values($1,$2,$3)", [id, orgA, role]);
    }
    await c.query("insert into contacts(id,organization_id,name,source) values($1,$3,'Pessoa fictícia A','manual'),($2,$4,'Pessoa fictícia B','manual')", [contactA, contactB, orgA, orgB]);
    await c.query("insert into channel_sessions(id,organization_id,waha_session_name,webhook_path_token,webhook_secret_encrypted,status) values($1,$2,$3,$3,decode('abcd','hex'),'WORKING')", [session, orgA, session]);
    await c.query("insert into conversations(id,organization_id,contact_id,channel_session_id,last_message_preview) values($1,$2,$3,$4,'PII fictícia')", [conversation,orgA,contactA,session]);
    await c.query("insert into messages(organization_id,conversation_id,contact_id,channel_session_id,type,direction,body,media_derived_text,media_storage_path) values($1,$2,$3,$4,'audio','inbound','PII fictícia','transcrição pessoal fictícia',$5)", [orgA,conversation,contactA,session,`${orgA}/${conversation}/teste.ogg`]);
    await c.query("insert into followup_flow_pointers(id,organization_id,name,draft_graph) values($1,$2,'Fluxo fictício','{}')", [pointer,orgA]);
    await c.query("insert into followup_flow_versions(id,organization_id,pointer_id,graph) values($1,$2,$3,'{}')", [version,orgA,pointer]);
    await c.query("insert into followup_enrollments(id,organization_id,pointer_id,version_id,contact_id,current_node_id) values($1,$2,$3,$4,$5,'start')", [enrollment,orgA,pointer,version,contactA]);
    await c.query("insert into followup_enrollment_events(id,organization_id,enrollment_id,node_id,event_type,idempotency_key) values($1::uuid,$2,$3,'start','enrolled',$1::text)", [event,orgA,enrollment]);
    await c.query("insert into lead_checkpoints(id,organization_id,contact_id,rolling_summary,commitments,objections,next_action) values($1,$2,$3,'Resumo pessoal fictício','[\"nome fictício\"]','[\"objeção fictícia\"]','Telefonar para pessoa fictícia')", [checkpoint,orgA,contactA]);
    await c.query("insert into lead_notes(organization_id,contact_id,headline,body) values($1,$2,'nome fictício','dados fictícios')", [orgA,contactA]);
    await c.query("insert into lead_state(organization_id,contact_id,next_action,qualification) values($1,$2,'dados fictícios','{\"pessoa\":\"fictícia\"}')", [orgA,contactA]);
    await c.query("insert into conversation_notes(organization_id,conversation_id,body,created_by_user_id,created_by_name) values($1,$2,'PII fictícia',$3,'Equipe fictícia')", [orgA,conversation,users.admin]);
    await c.query("insert into followup_flow_pointers(id,organization_id,name) values($1,$2,'Fluxo B')",[otherPointer,orgB]);
    await c.query("insert into followup_flow_versions(id,organization_id,pointer_id,graph) values($1,$2,$3,'{}'),($4,$5,$6,'{}')",[otherVersion,orgB,otherPointer,spareVersion,orgA,pointer]);
    await c.query("insert into followup_enrollments(id,organization_id,pointer_id,version_id,contact_id,current_node_id) values($1,$2,$3,$4,$5,'start')",[otherEnrollment,orgB,otherPointer,otherVersion,contactB]);
    await c.query("insert into followup_enrollment_events(organization_id,enrollment_id,node_id,event_type,idempotency_key) values($1,$2,'start','enrolled',$3)",[orgB,otherEnrollment,randomUUID()]);
    await c.query("insert into job_queue(organization_id,contact_id,kind,payload) values($1,$2,'followup_turn','{}')",[orgA,contactA]);
    await c.query("insert into ai_agents(id,organization_id,name,system_prompt) values($1,$2,'Agente fictício','Prompt fictício')",[agent,orgA]);
    await c.query("insert into ai_agent_versions(id,organization_id,agent_id,version_number,system_prompt,provider,model,channel_session_id) values($1,$2,$3,1,'Prompt fictício','openai','modelo-ficticio',$4)",[agentVersion,orgA,agent,session]);
    await c.query("insert into ai_agent_runs(organization_id,agent_id,agent_version_id,contact_id,conversation_id,tool_calls,error_message) values($1,$2,$3,$4,$5,'[{\"arguments\":\"nome fictício\"}]','PII fictícia')",[orgA,agent,agentVersion,contactA,conversation]);
    await c.query("insert into contacts(id,organization_id,name,source) values($1,$2,'Contato com agenda','manual')",[blockedContact,orgA]);
    await c.query("insert into conversations(id,organization_id,contact_id,channel_session_id) values($1,$2,$3,$4)",[blockedConversation,orgA,blockedContact,session]);
    await c.query("insert into messages(organization_id,conversation_id,contact_id,channel_session_id,type,direction,body) values($1,$2,$3,$4,'text','inbound','Histórico fictício preservado')",[orgA,blockedConversation,blockedContact,session]);
    await c.query("insert into calendar_appointments(organization_id,contact_id,title,starts_at,ends_at,owner_user_id) values($1,$2,'Consulta fictícia',now()+interval '1 day',now()+interval '1 day 30 minutes',$3)",[orgA,blockedContact,users.admin]);
  } finally { c.release(); }
});
afterAll(async () => { await pool.end(); });
async function asRole<T>(role: string, operation: (c: PoolClient) => Promise<T>, dbRole = "authenticated"): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${dbRole}`);
    await c.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [users[role] ?? "", JSON.stringify({sub: users[role] ?? null, role: dbRole, aal: "aal1"})]);
    return await operation(c);
  } finally { await c.query("rollback"); c.release(); }
}
describe("banco local — auditoria e isolamento", () => {
  for (const dbRole of ["authenticated", "service_role", "crm_geral_app"]) {
    it(`${dbRole}: INSERT legítimo; UPDATE/DELETE/TRUNCATE recusados`, async () => {
      await asRole("admin", async c => {
        const inserted = await c.query("insert into api_audit_log(organization_id,action,resource_type,resource_id) values($1,'hardening.test','contact',$2) returning id", [orgA,contactA]);
        expect(inserted.rows).toHaveLength(1);
      }, dbRole);
      for (const statement of ["update api_audit_log set action='tampered'", "delete from api_audit_log", "truncate api_audit_log"]) {
        await expect(asRole("admin", c => c.query(statement), dbRole)).rejects.toMatchObject({code: "42501"});
      }
    });
  }
  const tables = ["followup_flow_pointers", "followup_enrollments", "followup_enrollment_events", "followup_flow_versions"];
  for (const role of ["viewer", "agent", "manager", "admin"]) {
    it(`${role}: lê A; não lê B; autorização UPDATE/DELETE por operação`, async () => {
      await asRole(role, async c => {
        for (const table of tables) {
          expect((await c.query(`select * from ${table} where organization_id=$1`, [orgA])).rows.length).toBeGreaterThan(0);
          expect((await c.query(`select * from ${table} where organization_id=$1`, [orgB])).rows).toHaveLength(0);
          const writable = ["manager","admin"].includes(role) && ["followup_flow_pointers","followup_enrollments"].includes(table);
          expect((await c.query(`update ${table} set organization_id=organization_id where organization_id=$1 returning id`, [orgA])).rows.length > 0).toBe(writable);
        }
      });
      for (const table of tables) {
        await asRole(role, async c => {
          const deletable = ["manager","admin"].includes(role) && table !== "followup_enrollment_events";
          const condition=table === "followup_flow_versions" ? " and id='"+spareVersion+"'" : "";
          expect((await c.query(`delete from ${table} where organization_id=$1${condition} returning id`, [orgA])).rows.length > 0).toBe(deletable);
          expect((await c.query(`delete from ${table} where organization_id=$1 returning id`, [orgB])).rows).toHaveLength(0);
        });
      }
    });
    it(`${role}: INSERT conforme rota e cross-tenant negado`, async () => {
      for (const [table, sql, args] of [
        ["followup_flow_pointers", "insert into followup_flow_pointers(organization_id,name) values($1,'Novo') returning id", [orgA]],
        ["followup_enrollments", "insert into followup_enrollments(organization_id,pointer_id,version_id,contact_id,current_node_id,status) values($1,$2,$3,$4,'start','completed') returning id", [orgA,pointer,version,contactA]],
        ["followup_enrollment_events", "insert into followup_enrollment_events(organization_id,enrollment_id,node_id,event_type,idempotency_key) values($1,$2,'start','paused',$3) returning id", [orgA,enrollment,randomUUID()]],
        ["followup_flow_versions", "insert into followup_flow_versions(organization_id,pointer_id,graph) values($1,$2,'{}') returning id", [orgA,pointer]],
      ] as Array<[string,string,unknown[]]>) {
        if (["manager","admin"].includes(role) && table !== "followup_flow_versions") {
          expect((await asRole(role,c=>c.query(sql,args))).rows).toHaveLength(1);
        } else {
          await expect(asRole(role,c=>c.query(sql,args))).rejects.toMatchObject({code:"42501"});
        }
        await expect(asRole(role,c=>c.query(sql,[orgB,...args.slice(1)]))).rejects.toMatchObject({code:"42501"});
      }
    });
  }
  it("UPDATE não transfere linha para B", async () => {
    for (const table of ["followup_flow_pointers","followup_enrollments"]) {
      await expect(asRole("manager", c=>c.query(`update ${table} set organization_id=$1 where organization_id=$2`,[orgB,orgA]))).rejects.toMatchObject({code:"42501"});
    }
  });
});
describe("exclusão transacional e LGPD", () => {
  it("falha na ficha reverte mensagens/conversas", async () => {
    await asRole("admin",async c=>{
      await c.query("reset role");
      await c.query("create function public.hardening_bloquear_delete() returns trigger language plpgsql as $$ begin raise exception 'ficha bloqueada' using errcode='23503'; end $$; create trigger hardening_bloquear_delete before delete on contacts for each row execute function public.hardening_bloquear_delete()");
      await c.query("set local role authenticated; savepoint deletion");
      await expect(c.query("select fn_apagar_contato_com_historico($1,$2)",[contactA,orgA])).rejects.toMatchObject({code:"23503"});
      await c.query("rollback to savepoint deletion");
      expect((await c.query("select id from messages where conversation_id=$1",[conversation])).rows).toHaveLength(1);
      expect((await c.query("select id from conversations where id=$1",[conversation])).rows).toHaveLength(1);
    });
  });
  it("exclusão permitida remove ficha, histórico e follow-up em cascata", async () => {
    await asRole("admin",async c=>{
      expect((await c.query("select fn_apagar_contato_com_historico($1,$2) as removed",[contactA,orgA])).rows[0].removed).toBe(true);
      for(const table of ["contacts","messages","conversations","followup_enrollments"]) {
        const column=table==='contacts' ? 'id':'contact_id';
        expect((await c.query(`select id from ${table} where organization_id=$1 and ${column}=$2`,[orgA,contactA])).rows).toHaveLength(0);
      }
    });
  });
  it("não apaga B; DELETE direto de turno interno continua recusado", async () => {
    expect((await asRole("admin",c=>c.query("select fn_apagar_contato_com_historico($1,$2) as removed",[contactB,orgB]))).rows[0].removed).toBe(false);
    await expect(asRole("admin",async c=>{
      return c.query("delete from job_queue where contact_id=$1",[contactA]);
    })).rejects.toMatchObject({code:"42501"});
  });
  it("RESTRICT real da agenda deixa ficha e histórico intactos",async()=>{
    await expect(asRole("admin",c=>c.query("select fn_apagar_contato_com_historico($1,$2)",[blockedContact,orgA]))).rejects.toMatchObject({code:"23001"});
    expect((await pool.query("select id from messages where conversation_id=$1",[blockedConversation])).rows).toHaveLength(1);
    expect((await pool.query("select id from contacts where id=$1",[blockedContact])).rows).toHaveLength(1);
  });
  it("porta da ficha usa a mesma cascata; viewer não pode anonimizar",async()=>{
    await expect(asRole("viewer",c=>c.query("select fn_lgpd_anonymize_contact($1,$2)",[orgA,contactA]))).rejects.toMatchObject({code:"42501"});
    await asRole("admin",async c=>{
      await c.query("select fn_lgpd_anonymize_contact($1,$2)",[orgA,contactA]);
      expect((await c.query("select media_derived_text,body from messages where conversation_id=$1",[conversation])).rows[0]).toEqual({media_derived_text:null,body:"[mensagem anonimizada]"});
      expect((await c.query("select tool_calls from ai_agent_runs where contact_id=$1",[contactA])).rows[0].tool_calls).toEqual([]);
      const second=(await c.query("select fn_lgpd_anonymize_contact($1,$2) as result",[orgA,contactA])).rows[0].result;
      expect(second.already_anonymized).toBe(true);
    });
  });
  it("cascata formal redige objetos existentes e impede transcrição atrasada", async () => {
    await asRole("admin",async c=>{
      await c.query("set local role service_role");
      await c.query("select fn_lgpd_cascade_redact_contact($1,$2,null)",[orgA,contactA]);
      const message=(await c.query("select body,media_derived_text,media_storage_path from messages where conversation_id=$1",[conversation])).rows[0];
      expect(message).toEqual({body:"[mensagem anonimizada]",media_derived_text:null,media_storage_path:null});
      await c.query("update messages set media_derived_text='PII atrasada' where conversation_id=$1",[conversation]);
      expect((await c.query("select media_derived_text from messages where conversation_id=$1",[conversation])).rows[0].media_derived_text).toBeNull();
      expect((await c.query("select next_action,qualification from lead_state where contact_id=$1",[contactA])).rows[0]).toEqual({next_action:null,qualification:{}});
      expect((await c.query("select body from lead_notes where contact_id=$1",[contactA])).rows[0].body).toBe("(anonimizado)");
      expect((await c.query("select tool_calls,error_message from ai_agent_runs where contact_id=$1",[contactA])).rows[0]).toEqual({tool_calls:[],error_message:null});
      expect((await c.query("select rolling_summary,next_action from lead_checkpoints where id=$1",[checkpoint])).rows[0]).toEqual({rolling_summary:"[resumo anonimizado]",next_action:null});
      expect((await c.query("select body from conversation_notes where conversation_id=$1",[conversation])).rows[0].body).toBe("[nota interna anonimizada]");
      expect((await c.query("select name from contacts where id=$1",[contactB])).rows[0].name).toBe("Pessoa fictícia B");
      expect((await c.query("select object_path from storage_redaction_queue where organization_id=$1",[orgA])).rows).toHaveLength(1);
    });
  });
});

});
