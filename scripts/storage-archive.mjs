#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { once } from "node:events";
import { createInterface } from "node:readline";

const FORMATO = "crm-geral-storage-jsonl-v1";
const GERAL_1_REF = "zwjrhqqwizjpzmeayrju";
const CONFIRMACAO_ISOLADA = "I_CREATED_AN_EMPTY_DISPOSABLE_PROJECT";
const TAMANHO_PAGINA = 100;
const CAMPOS_SISTEMA = new Set([
  "cacheControl",
  "contentLength",
  "eTag",
  "httpStatusCode",
  "lastModified",
  "mimetype",
  "size",
]);

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function projectRef(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".supabase.co") ? host.slice(0, -".supabase.co".length) : null;
  } catch {
    return null;
  }
}

function fail(message) {
  throw new Error(message);
}

function requireSafePath(path) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    fail("Storage archive contains an unsafe object path");
  }
}

function sameStringArray(a, b) {
  if (a == null || b == null) return a == null && b == null;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function writeRecord(output, record) {
  if (!output.write(`${JSON.stringify(record)}\n`)) await once(output, "drain");
}

async function listAllObjects(client, bucket, prefix, onObject) {
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: TAMANHO_PAGINA,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) fail("Storage listing failed");
    const entries = data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      requireSafePath(path);
      if (entry.id == null && entry.metadata == null) {
        await listAllObjects(client, bucket, path, onObject);
      } else {
        await onObject(path, entry);
      }
    }
    if (entries.length < TAMANHO_PAGINA) return;
    offset += entries.length;
  }
}

export async function exportStorageArchive({ client, output, metadata = {} }) {
  let objects = 0;
  let totalBytes = 0;
  const { data: buckets, error } = await client.storage.listBuckets();
  if (error) fail("Storage bucket inventory failed");

  await writeRecord(output, {
    type: "header",
    format: FORMATO,
    created_at: new Date().toISOString(),
    source_project_ref: metadata.projectRef ?? null,
    app_version: metadata.appVersion ?? null,
    git_commit: metadata.gitCommit ?? null,
    schema_version: metadata.schemaVersion ?? null,
  });

  for (const bucket of buckets ?? []) {
    await writeRecord(output, {
      type: "bucket",
      name: bucket.name,
      public: Boolean(bucket.public),
      file_size_limit: bucket.fileSizeLimit ?? null,
      allowed_mime_types: bucket.allowedMimeTypes ?? null,
    });

    await listAllObjects(client, bucket.name, "", async (path, entry) => {
      const { data, error: downloadError } = await client.storage.from(bucket.name).download(path);
      if (downloadError || !data) fail("Storage object download failed");
      const bytes = Buffer.from(await data.arrayBuffer());
      const metadata = entry.metadata ?? {};
      const customMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([key]) => !CAMPOS_SISTEMA.has(key)),
      );
      await writeRecord(output, {
        type: "object",
        bucket: bucket.name,
        path,
        size: bytes.length,
        sha256: hash(bytes),
        content_type: metadata.mimetype ?? "application/octet-stream",
        cache_control: metadata.cacheControl ?? "3600",
        metadata: customMetadata,
        bytes_base64: bytes.toString("base64"),
      });
      objects += 1;
      totalBytes += bytes.length;
    });
  }

  await writeRecord(output, { type: "end", buckets: (buckets ?? []).length, objects, total_bytes: totalBytes });
  return { buckets: (buckets ?? []).length, objects, totalBytes };
}

export function validateIsolatedRestoreTarget({ url, projectRef: ref, sourceUrl, confirmation }) {
  if (!url || !ref || confirmation !== CONFIRMACAO_ISOLADA) {
    fail("Restore requires an explicit isolated target and confirmation marker");
  }
  const normalized = ref.toLowerCase();
  const actualRef = projectRef(url);
  const sourceRef = projectRef(sourceUrl ?? "");
  if (normalized === GERAL_1_REF || normalized === sourceRef) {
    fail("Restore target is an active project and is refused");
  }
  if (actualRef && actualRef !== normalized) {
    fail("Restore target URL and project reference do not match");
  }
  if (!actualRef && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(url)) {
    fail("Restore target must be an isolated Supabase project or local instance");
  }
  return true;
}

async function* parseRecords(lines) {
  for await (const line of lines) {
    if (!line) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      fail("Storage archive is malformed");
    }
    yield record;
  }
}

export async function restoreStorageArchive({ client, records, onProgress = () => {} }) {
  let headerSeen = false;
  let endSeen = false;
  let objects = 0;
  let totalBytes = 0;
  const buckets = new Map();

  for await (const record of records) {
    if (record.type === "header") {
      if (headerSeen || record.format !== FORMATO) fail("Storage archive format is unsupported");
      headerSeen = true;
      continue;
    }
    if (!headerSeen || endSeen) fail("Storage archive record order is invalid");
    if (record.type === "bucket") {
      if (typeof record.name !== "string" || !record.name || buckets.has(record.name)) {
        fail("Storage archive bucket record is invalid");
      }
      const { data: existing, error: lookupError } = await client.storage.getBucket(record.name);
      if (lookupError && String(lookupError.statusCode) !== "404") fail("Target bucket lookup failed");
      if (!existing) {
        const { error } = await client.storage.createBucket(record.name, {
          public: record.public,
          fileSizeLimit: record.file_size_limit ?? undefined,
          allowedMimeTypes: record.allowed_mime_types ?? undefined,
        });
        if (error) fail("Target bucket creation failed");
      } else if (
        Boolean(existing.public) !== Boolean(record.public) ||
        (existing.fileSizeLimit ?? null) !== (record.file_size_limit ?? null) ||
        !sameStringArray(existing.allowedMimeTypes ?? null, record.allowed_mime_types ?? null)
      ) {
        fail("Target bucket configuration does not match the archive");
      }
      buckets.set(record.name, true);
      continue;
    }
    if (record.type === "object") {
      if (!buckets.has(record.bucket)) fail("Storage archive object references an unknown bucket");
      requireSafePath(record.path);
      if (typeof record.bytes_base64 !== "string") fail("Storage archive object bytes are missing");
      const bytes = Buffer.from(record.bytes_base64, "base64");
      if (bytes.length !== record.size || hash(bytes) !== record.sha256) {
        fail("Storage archive object checksum does not match");
      }
      const { error } = await client.storage.from(record.bucket).upload(record.path, bytes, {
        contentType: record.content_type,
        cacheControl: record.cache_control,
        metadata: record.metadata ?? {},
        upsert: false,
      });
      if (error) fail("Storage object upload failed");
      const { data, error: downloadError } = await client.storage.from(record.bucket).download(record.path);
      if (downloadError || !data || hash(Buffer.from(await data.arrayBuffer())) !== record.sha256) {
        fail("Restored Storage object checksum does not match");
      }
      objects += 1;
      totalBytes += bytes.length;
      continue;
    }
    if (record.type === "end") {
      if (record.buckets !== buckets.size || record.objects !== objects || record.total_bytes !== totalBytes) {
        fail("Storage archive totals do not match the restored content");
      }
      endSeen = true;
      onProgress({ buckets: buckets.size, objects, totalBytes });
      continue;
    }
    fail("Storage archive contains an unknown record type");
  }

  if (!headerSeen || !endSeen) fail("Storage archive is incomplete");
  return { buckets: buckets.size, objects, totalBytes };
}

async function readRestoreInput(input) {
  const lines = createInterface({ input, crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();
  const nextLine = async () => {
    const item = await iterator.next();
    if (item.done) fail("Restore target preamble is incomplete");
    return item.value;
  };
  const url = await nextLine();
  const key = await nextLine();
  const ref = await nextLine();
  const confirmation = await nextLine();
  return { url, key, ref, confirmation, iterator, lines };
}

async function main() {
  const mode = process.argv[2];
  if (mode === "export") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) fail("Storage export credentials are unavailable in the app container");
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await exportStorageArchive({
      client,
      output: process.stdout,
      metadata: {
        projectRef: projectRef(url),
        appVersion: process.env.APP_VERSION,
        gitCommit: process.env.GIT_COMMIT,
        schemaVersion: process.env.SCHEMA_VERSION,
      },
    });
    process.stderr.write(`Storage export complete: ${result.buckets} buckets, ${result.objects} objects, ${result.totalBytes} bytes\n`);
    return;
  }

  if (mode === "restore") {
    const config = await readRestoreInput(process.stdin);
    const sourceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    validateIsolatedRestoreTarget({
      url: config.url,
      projectRef: config.ref,
      sourceUrl,
      confirmation: config.confirmation,
    });
    const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const remainingLines = {
      async *[Symbol.asyncIterator]() {
        for (;;) {
          const item = await config.iterator.next();
          if (item.done) return;
          yield item.value;
        }
      },
    };
    const result = await restoreStorageArchive({
      client,
      records: parseRecords(remainingLines),
      onProgress: (progress) => process.stderr.write(
        `Storage restore verified: ${progress.buckets} buckets, ${progress.objects} objects, ${progress.totalBytes} bytes\n`,
      ),
    });
    config.lines.close();
    return result;
  }
  fail("Usage: storage-archive.mjs <export|restore>");
}

if (process.argv[1] === "-" || process.argv[1]?.endsWith("storage-archive.mjs")) {
  main().catch(() => {
    process.stderr.write("Storage archive operation failed; no credentials or object data were written to logs.\n");
    process.exitCode = 1;
  });
}
