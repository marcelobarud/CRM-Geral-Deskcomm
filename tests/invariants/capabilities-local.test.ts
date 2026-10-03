import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
const nativeUrl = process.env.CAPABILITIES_TEST_DB_URL;
if (nativeUrl && new URL(nativeUrl).pathname !== "/crm_geral_hardening_test")
  throw new Error("Use somente crm_geral_hardening_test temporário");
// O harness versionado isola /postgres por arquivo e entrega a porta efêmera.
const url =
  nativeUrl ??
  (process.env.TEST_DB_CONTAINER && process.env.TEST_DB_PORT
    ? `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT}/postgres`
    : undefined);
describe.skipIf(!url)("capabilities em PostgreSQL real", () => {
  const pool = new Pool({ connectionString: url });
  const orgA = randomUUID(),
    orgB = randomUUID();
  const adminA = randomUUID(),
    adminB = randomUUID(),
    agentA = randomUUID();
  const templateA = randomUUID(),
    templateB = randomUUID();
  beforeAll(async () => {
    await pool.query(
      "insert into organizations(id,legal_name,display_name,slug,settings) values($1,'A fictícia','A',$3,'{\"routing\":{\"existing\":true}}'),($2,'B fictícia','B',$4,'{}')",
      [orgA, orgB, orgA, orgB],
    );
    for (const [user, org, role] of [
      [adminA, orgA, "admin"],
      [adminB, orgB, "admin"],
      [agentA, orgA, "agent"],
    ]) {
      await pool.query("insert into auth.users(id,email) values($1,$2)", [
        user,
        `${user}@invariant.test`,
      ]);
      await pool.query(
        "insert into user_organizations(user_id,organization_id,role) values($1,$2,$3)",
        [user, org, role],
      );
    }
    await pool.query(
      "insert into message_templates(id,organization_id,title,body) values($1,$2,'A histórico','A texto'),($3,$4,'B histórico','B texto')",
      [templateA, orgA, templateB, orgB],
    );
  });
  afterAll(async () => {
    await pool.query("delete from organizations where id=any($1::uuid[])", [[orgA, orgB]]);
    await pool.query("delete from auth.users where id=any($1::uuid[])", [[adminA, adminB, agentA]]);
    await pool.end();
  });
  async function asUser<T>(
    user: string,
    fn: (c: PoolClient) => Promise<T>,
    role = "authenticated",
  ) {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query(`set local role ${role}`);
      await c.query(
        "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
        [user, JSON.stringify({ sub: user, role, aal: "aal1" })],
      );
      return await fn(c);
    } finally {
      await c.query("rollback");
      c.release();
    }
  }
  it("defaults, desconhecida e escrita atômica preservam settings e outra organização", async () => {
    await asUser(adminA, async (c) => {
      expect(
        (await c.query("select fn_capability_enabled($1,'message_templates') enabled", [orgA]))
          .rows[0].enabled,
      ).toBe(true);
      expect(
        (await c.query("select fn_capability_enabled($1,'campaigns') enabled", [orgA])).rows[0]
          .enabled,
      ).toBe(false);
      const saved = (
        await c.query("select fn_set_capability($1,'message_templates',false) result", [orgA])
      ).rows[0].result;
      expect(saved).toEqual({ previous_enabled: true, enabled: false, revision: 1 });
      const row = (await c.query("select settings from organizations where id=$1", [orgA])).rows[0];
      expect(row.settings.routing).toEqual({ existing: true });
      expect((await c.query("select * from organizations where id=$1", [orgB])).rows).toHaveLength(
        0,
      );
      expect(
        (await c.query("select * from message_templates where organization_id=$1", [orgA])).rows,
      ).toHaveLength(1);
      expect(
        (
          await c.query("update message_templates set body='alterado' where id=$1 returning id", [
            templateA,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(
        (await c.query("delete from message_templates where id=$1 returning id", [templateA])).rows,
      ).toHaveLength(0);
      await expect(
        c.query(
          "insert into message_templates(organization_id,title,body) values($1,'novo','novo')",
          [orgA],
        ),
      ).rejects.toMatchObject({ code: "42501" });
    });
    await asUser(adminB, async (c) => {
      expect(
        (await c.query("select fn_capability_enabled($1,'message_templates') enabled", [orgB]))
          .rows[0].enabled,
      ).toBe(true);
      expect(
        (
          await c.query("update message_templates set body='permitido' where id=$1 returning id", [
            templateB,
          ])
        ).rows,
      ).toHaveLength(1);
      expect(
        (await c.query("select * from message_templates where organization_id=$1", [orgA])).rows,
      ).toHaveLength(0);
    });
  });
  it("habilitar/desabilitar incrementa revisão sem apagar texto", async () =>
    asUser(adminA, async (c) => {
      await c.query("select fn_set_capability($1,'message_templates',false)", [orgA]);
      expect(
        (await c.query("select fn_set_capability($1,'message_templates',true) result", [orgA]))
          .rows[0].result,
      ).toMatchObject({ revision: 2 });
      expect(
        (await c.query("select body from message_templates where id=$1", [templateA])).rows[0].body,
      ).toBe("A texto");
      expect(
        (
          await c.query("update message_templates set body='permitido' where id=$1 returning id", [
            templateA,
          ])
        ).rows,
      ).toHaveLength(1);
    }));
  it("snapshot antigo de outro formulário não ressuscita flag desativada", async () =>
    asUser(adminA, async (c) => {
      await c.query("select fn_set_capability($1,'message_templates',false)", [orgA]);
      // Simula escrita autorizada por service role de um dono irmão de settings.
      await c.query("set local role service_role");
      await c.query('update organizations set settings=\'{"routing":{"new":true}}\' where id=$1', [
        orgA,
      ]);
      const config = (await c.query("select settings from organizations where id=$1", [orgA]))
        .rows[0].settings;
      expect(config.routing).toEqual({ new: true });
      expect(config.capabilities.overrides.message_templates).toBe(false);
      expect(config.capabilities.revision).toBe(1);
    }));
  it("agent não administra; admin A não altera B", async () => {
    await asUser(agentA, async (c) => {
      await expect(
        c.query("select fn_set_capability($1,'message_templates',false)", [orgA]),
      ).rejects.toMatchObject({ code: "42501" });
    });
    await asUser(adminA, async (c) => {
      await expect(
        c.query("select fn_set_capability($1,'message_templates',false)", [orgB]),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
  it("anon não executa funções; service role não administra via RPC", async () => {
    await asUser(
      adminA,
      async (c) => {
        await expect(
          c.query("select fn_capability_enabled($1,'message_templates')", [orgA]),
        ).rejects.toMatchObject({ code: "42501" });
      },
      "anon",
    );
    await asUser(
      adminA,
      async (c) => {
        await expect(
          c.query("select fn_set_capability($1,'message_templates',true)", [orgA]),
        ).rejects.toMatchObject({ code: "42501" });
      },
      "service_role",
    );
  });
  it("formato inválido não habilita mutação por default", async () => {
    const fixture = await pool.connect();
    try {
      await fixture.query("begin");
      await fixture.query("select set_config('crm.capabilities_write','1',true)");
      await fixture.query(
        "update organizations set settings=jsonb_set(settings,'{capabilities}','{\"version\":2}') where id=$1",
        [orgA],
      );
      await fixture.query("commit");
    } finally {
      fixture.release();
    }
    await asUser(adminA, async (c) => {
      expect(
        (await c.query("select fn_capability_enabled($1,'message_templates') enabled", [orgA]))
          .rows[0].enabled,
      ).toBe(false);
      expect(
        (await c.query("select * from message_templates where id=$1", [templateA])).rows,
      ).toHaveLength(1);
      await c.query("select fn_set_capability($1,'message_templates',true)", [orgA]);
      expect(
        (await c.query("select fn_capability_enabled($1,'message_templates') enabled", [orgA]))
          .rows[0].enabled,
      ).toBe(true);
    });
  });
});
