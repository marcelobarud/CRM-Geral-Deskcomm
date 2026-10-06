import type { Writable } from "node:stream";

export interface StorageArchiveTotals {
  buckets: number;
  objects: number;
  totalBytes: number;
}

export interface StorageArchiveMetadata {
  projectRef?: string | null;
  appVersion?: string | null;
  gitCommit?: string | null;
  schemaVersion?: string | null;
}

export function exportStorageArchive(args: {
  client: unknown;
  output: Writable;
  metadata?: StorageArchiveMetadata;
}): Promise<StorageArchiveTotals>;

export function validateIsolatedRestoreTarget(args: {
  url: string;
  projectRef: string;
  sourceUrl?: string;
  confirmation: string;
}): true;

export function restoreStorageArchive(args: {
  client: unknown;
  records: AsyncIterable<unknown> | Iterable<unknown>;
  onProgress?: (totals: StorageArchiveTotals) => void;
}): Promise<StorageArchiveTotals>;
