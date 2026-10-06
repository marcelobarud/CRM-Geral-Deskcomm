import { createHash } from "node:crypto";
import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  exportStorageArchive,
  restoreStorageArchive,
  validateIsolatedRestoreTarget,
} from "../../scripts/storage-archive.mjs";

const PDF = Buffer.from("%PDF-1.7\nsynthetic proposal\n%%EOF\n");
const LOGO = Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function memoryStorage(initial = new Map<string, { bytes: Buffer; options: Record<string, unknown> }>()) {
  const buckets = new Map<string, { name: string; public: boolean; fileSizeLimit: number | null; allowedMimeTypes: string[] | null }>([
    ["proposal-documents", { name: "proposal-documents", public: false, fileSizeLimit: 20_000_000, allowedMimeTypes: ["application/pdf"] }],
    ["brand-logos", { name: "brand-logos", public: false, fileSizeLimit: 2_000_000, allowedMimeTypes: ["image/png", "image/svg+xml"] }],
  ]);
  const objects = initial;
  const client = {
    storage: {
      listBuckets: async () => ({ data: [...buckets.values()], error: null }),
      getBucket: async (name: string) => buckets.has(name)
        ? ({ data: buckets.get(name), error: null })
        : ({ data: null, error: { statusCode: 404 } }),
      createBucket: async (name: string, config: Record<string, unknown>) => {
        buckets.set(name, {
          name,
          public: Boolean(config.public),
          fileSizeLimit: (config.fileSizeLimit as number | null | undefined) ?? null,
          allowedMimeTypes: (config.allowedMimeTypes as string[] | null | undefined) ?? null,
        });
        return { error: null };
      },
      from: (bucket: string) => ({
        list: async (prefix: string) => {
          const children = new Map<string, Record<string, unknown>>();
          for (const [key, file] of objects) {
            if (!key.startsWith(`${bucket}:`)) continue;
            const objectPath = key.slice(bucket.length + 1);
            if (prefix && !objectPath.startsWith(`${prefix}/`)) continue;
            const rest = prefix ? objectPath.slice(prefix.length + 1) : objectPath;
            if (!rest) continue;
            const [name, ...tail] = rest.split("/");
            if (tail.length) children.set(name!, { name, id: null, metadata: null });
            else children.set(name!, { name, id: "file-id", metadata: { mimetype: file.options.contentType, cacheControl: file.options.cacheControl, custom: "preserved" } });
          }
          return { data: [...children.values()], error: null };
        },
        download: async (path: string) => {
          const found = objects.get(`${bucket}:${path}`);
          const bytes = found ? new Uint8Array(new ArrayBuffer(found.bytes.byteLength)) : null;
          if (found && bytes) bytes.set(found.bytes);
          return found
            ? ({ data: new Blob([bytes!.buffer]), error: null })
            : ({ data: null, error: { statusCode: 404 } });
        },
        upload: async (path: string, bytes: Buffer, options: Record<string, unknown>) => {
          const key = `${bucket}:${path}`;
          if (objects.has(key)) return { error: { statusCode: 409 } };
          objects.set(key, { bytes: Buffer.from(bytes), options });
          return { error: null };
        },
      }),
    },
  };
  return { client, buckets, objects };
}

async function archiveFrom(client: ReturnType<typeof memoryStorage>["client"]) {
  const chunks: Buffer[] = [];
  const stream = new Writable({ write(chunk, _encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
  await exportStorageArchive({ client: client as never, output: stream, metadata: { projectRef: "source-ref" } });
  return Buffer.concat(chunks).toString("utf8").trim().split("\n").map((line) => JSON.parse(line));
}

describe("arquivo de Storage de backup", () => {
  it("exporta buckets, bytes, metadados e hashes; restaura e relê PDF e logo sintéticos", async () => {
    const source = memoryStorage(new Map([
      ["proposal-documents:synthetic/proposal-v1.pdf", { bytes: PDF, options: { contentType: "application/pdf", cacheControl: "3600" } }],
      ["brand-logos:synthetic/logo.svg", { bytes: LOGO, options: { contentType: "image/svg+xml", cacheControl: "120" } }],
    ]));
    const records = await archiveFrom(source.client);
    const pdf = records.find((record) => record.type === "object" && record.path.endsWith("proposal-v1.pdf"));
    expect(pdf).toMatchObject({ size: PDF.length, sha256: sha(PDF), content_type: "application/pdf" });
    expect(records.some((record) => record.type === "object" && record.path.endsWith("logo.svg"))).toBe(true);

    const target = memoryStorage(new Map());
    const restored = await restoreStorageArchive({ client: target.client as never, records });
    expect(restored).toEqual({ buckets: 2, objects: 2, totalBytes: PDF.length + LOGO.length });
    expect(target.objects.get("proposal-documents:synthetic/proposal-v1.pdf")?.bytes).toEqual(PDF);
    expect(target.objects.get("brand-logos:synthetic/logo.svg")?.bytes).toEqual(LOGO);
  });

  it("recusa destino ativo, URL/ref divergente e falta de confirmação isolada", () => {
    const base = { confirmation: "I_CREATED_AN_EMPTY_DISPOSABLE_PROJECT" };
    expect(() => validateIsolatedRestoreTarget({ ...base, url: "https://zwjrhqqwizjpzmeayrju.supabase.co", projectRef: "zwjrhqqwizjpzmeayrju" }))
      .toThrow("active project");
    expect(() => validateIsolatedRestoreTarget({ ...base, url: "https://other-ref.supabase.co", projectRef: "different-ref" }))
      .toThrow("do not match");
    expect(() => validateIsolatedRestoreTarget({ url: "https://target.supabase.co", projectRef: "target", sourceUrl: "https://target.supabase.co", confirmation: base.confirmation }))
      .toThrow("active project");
    expect(() => validateIsolatedRestoreTarget({ url: "https://target.supabase.co", projectRef: "target", confirmation: "RESTAURAR" }))
      .toThrow("confirmation marker");
  });
});
