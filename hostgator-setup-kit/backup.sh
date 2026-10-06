#!/usr/bin/env bash
# Produz um pacote coerente de dados PostgreSQL + bytes de Storage.
# O destino precisa ser um volume externo e protegido/criptografado pelo operador.
# Este script não copia .env, chaves, tokens nem configuração de Auth do projeto.
set -euo pipefail
source "$(dirname "$0")/_common.sh"
enter_project

command -v sha256sum >/dev/null 2>&1 || die "sha256sum não encontrado; nenhum backup foi iniciado."
command -v mktemp >/dev/null 2>&1 || die "mktemp não encontrado; nenhum backup foi iniciado."

BACKUP_DIR="${BACKUP_DIR:-}"
[ -n "$BACKUP_DIR" ] || die "Configure BACKUP_DIR para um destino externo ao repositório (idealmente offsite/cifrado)."
case "$BACKUP_DIR" in /*) ;; *) die "BACKUP_DIR precisa ser um caminho absoluto fora do repositório." ;; esac
mkdir -p "$BACKUP_DIR"
BACKUP_ROOT="$(cd "$BACKUP_DIR" && pwd -P)"
PROJECT_REAL="$(cd "$PROJECT_DIR" && pwd -P)"
case "$BACKUP_ROOT/" in
  "$PROJECT_REAL/"*) die "BACKUP_DIR está dentro do repositório; escolha destino externo." ;;
esac

umask 077
ts="$(date -u +%Y%m%dT%H%M%SZ)"
tmp="$(mktemp -d "$BACKUP_ROOT/.crm-geral-backup-${ts}.XXXXXX")"
nonce="${tmp##*.}"
final="$BACKUP_ROOT/crm-geral-backup-${ts}-${nonce}"
[ ! -e "$final" ] || die "Já existe um pacote de backup com este identificador."
limpar_tmp() { [ -z "${tmp:-}" ] || [ ! -d "$tmp" ] || rm -rf -- "$tmp"; }
trap limpar_tmp EXIT INT TERM
mkdir -p "$tmp/artifacts"

step "Exportando registros do CRM e Auth (sem sessões temporárias)"
pg_container "$(url_do_schema)" -- pg_dump \
  --format=custom --data-only --no-owner --no-privileges \
  --schema=public --schema=private --schema=auth \
  --exclude-table-data=auth.sessions \
  --exclude-table-data=auth.refresh_tokens \
  --exclude-table-data=auth.mfa_challenges \
  --exclude-table-data=auth.one_time_tokens \
  --exclude-table-data=auth.flow_state \
  --exclude-table-data=auth.audit_log_entries \
  > "$tmp/artifacts/database.data.dump"
[ -s "$tmp/artifacts/database.data.dump" ] || die "O dump do banco ficou vazio; backup interrompido."

step "Exportando buckets, configurações e bytes reais de Storage"
dc exec -T app node scripts/storage-archive.mjs export > "$tmp/artifacts/storage.jsonl" \
  || die "O export de Storage falhou; backup incompleto descartado. Atualize a imagem do app e tente novamente."
grep -q '"type":"end"' "$tmp/artifacts/storage.jsonl" \
  || die "O arquivo de Storage não contém o marcador final de integridade."

step "Registrando baseline, ledger e identidade dos artefatos"
cp supabase/baseline.sql "$tmp/artifacts/baseline.sql"
cp supabase/migrations/MANIFEST.md "$tmp/artifacts/migration-manifest.md"

version="$(dc exec -T app node -p 'process.env.APP_VERSION || "desconhecido"' 2>/dev/null | tail -1)"
git_commit="$(dc exec -T app node -p 'process.env.GIT_COMMIT || "desconhecido"' 2>/dev/null | tail -1)"
schema_version="$(dc exec -T app node -p 'process.env.SCHEMA_VERSION || "desconhecido"' 2>/dev/null | tail -1)"
[ -n "$version" ] || version="desconhecido"
[ -n "$git_commit" ] || git_commit="desconhecido"
[ -n "$schema_version" ] || schema_version="desconhecido"
source_ref="$(sed -n '1s/.*"source_project_ref":"\([^"]*\)".*/\1/p' "$tmp/artifacts/storage.jsonl")"
waha_state="not-included"
[ "${BACKUP_WAHA_DATA:-0}" = "1" ] && waha_state="included"
{
  printf 'product=CRM Geral\n'
  printf 'backup_created_utc=%s\n' "$ts"
  printf 'source_project_ref=%s\n' "${source_ref:-unknown}"
  printf 'app_version=%s\n' "$version"
  printf 'git_commit=%s\n' "$git_commit"
  printf 'schema_version=%s\n' "$schema_version"
  printf 'app_image=%s\n' "${APP_IMAGE:-compose-default}"
  printf 'worker_image=%s\n' "${WORKER_IMAGE:-compose-default}"
  printf 'scheduler_image=%s\n' "${SCHEDULER_IMAGE:-compose-default}"
  printf 'auth_password_hashes=database rows included; target Auth config and API keys are separate\n'
  printf 'auth_sessions=excluded; users must authenticate again after restore\n'
  printf 'storage=all listed buckets and downloaded object bytes; per-object SHA-256 in archive\n'
  printf 'waha_volume=%s\n' "$waha_state"
  printf 'secrets=not copied; restore target requires separately provisioned configuration\n'
} > "$tmp/release-metadata.txt"
cat > "$tmp/README.txt" <<'README'
CRM Geral recovery bundle

Contents include application/Auth database rows, the exact baseline and migration
manifest captured by this checkout, a Storage archive containing bucket settings
and object bytes, plus release metadata and SHA-256 checksums.

Auth sessions and transient token/challenge tables are excluded. Restore requires
a new isolated Supabase project; configure Auth providers, SMTP, JWT/project keys,
external integrations and runtime secrets separately. A successful file restore
does not prove login, RLS, MFA, or application behavior. Run the isolated restore
validation in docs/BACKUP_RESTORE_RUNBOOK.md before treating this bundle as usable.

This directory contains customer data. Keep it on an access-controlled encrypted
offsite destination. Never commit or attach it to a support ticket.
README

if [ "${BACKUP_WAHA_DATA:-0}" = "1" ]; then
  step "Arquivando o volume WAHA solicitado"
  compose_project="${COMPOSE_PROJECT_NAME:-$(basename "$PROJECT_REAL" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')}"
  waha_volume="${compose_project}_waha-data"
  docker volume inspect "$waha_volume" >/dev/null 2>&1 || die "BACKUP_WAHA_DATA=1 foi pedido, mas o volume não existe."
  docker run --rm --network none -v "$waha_volume:/source:ro" alpine:3.20 \
    tar czf - -C /source . > "$tmp/artifacts/waha-data.tar.gz"
  [ -s "$tmp/artifacts/waha-data.tar.gz" ] || die "O snapshot do volume WAHA ficou vazio."
  docker run --rm -i --network none alpine:3.20 tar tzf - < "$tmp/artifacts/waha-data.tar.gz" >/dev/null \
    || die "Não foi possível reler o arquivo do volume WAHA."
  printf 'waha_volume_name=%s\n' "$waha_volume" >> "$tmp/release-metadata.txt"
  printf 'waha_session_data=contains sensitive session state; protect with encrypted storage\n' >> "$tmp/release-metadata.txt"
fi

step "Verificando formato do dump e checksums do pacote"
pg_container "$(url_do_schema)" --mount "type=bind,source=$tmp/artifacts/database.data.dump,target=/backup.dump,readonly" \
  -- pg_restore --list /backup.dump > "$tmp/artifacts/database.toc"
[ -s "$tmp/artifacts/database.toc" ] || die "O dump não pôde ser inspecionado após gravação."
(cd "$tmp" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
(cd "$tmp" && sha256sum --check SHA256SUMS >/dev/null)
mv "$tmp" "$final"
tmp=""
trap - EXIT INT TERM
c_grn "✓ backup gerado e relido: $final"
c_ylw "⚠ contém dados de cliente/Auth/Storage; mova ou mantenha somente em destino externo criptografado."
