#!/usr/bin/env bash
# Restauração somente para um Supabase novo, isolado e descartável.
# Não usa NEXT_PUBLIC_SUPABASE_URL/SUPABASE_DB_URL do projeto de origem.
set -euo pipefail
source "$(dirname "$0")/_common.sh"
enter_project

BUNDLE="${1:-}"
[ -n "$BUNDLE" ] && [ -d "$BUNDLE" ] || die "Uso: restore.sh <diretório-crm-geral-backup>"
BUNDLE="$(cd "$BUNDLE" && pwd -P)"
[ -f "$BUNDLE/SHA256SUMS" ] || die "Pacote sem SHA256SUMS; nenhuma conexão foi aberta."
(
  cd "$BUNDLE"
  sha256sum --check SHA256SUMS
) || die "Checksum inválido; pacote recusado antes de qualquer escrita."

for item in artifacts/baseline.sql artifacts/database.data.dump artifacts/storage.jsonl; do
  [ -s "$BUNDLE/$item" ] || die "Pacote incompleto (ausente/vazio: $item)."
done

RESTORE_TARGET_SUPABASE_URL="${RESTORE_TARGET_SUPABASE_URL:-}"
RESTORE_TARGET_PROJECT_REF="${RESTORE_TARGET_PROJECT_REF:-}"
RESTORE_TARGET_SERVICE_ROLE_KEY="${RESTORE_TARGET_SERVICE_ROLE_KEY:-}"
RESTORE_TARGET_DB_URL="${RESTORE_TARGET_DB_URL:-}"
[ -n "$RESTORE_TARGET_SUPABASE_URL" ] || die "Defina RESTORE_TARGET_SUPABASE_URL para o projeto descartável."
[ -n "$RESTORE_TARGET_PROJECT_REF" ] || die "Defina RESTORE_TARGET_PROJECT_REF explicitamente."
[ -n "$RESTORE_TARGET_SERVICE_ROLE_KEY" ] || die "Defina RESTORE_TARGET_SERVICE_ROLE_KEY no processo sem gravá-la em arquivo."
[ -n "$RESTORE_TARGET_DB_URL" ] || die "Defina RESTORE_TARGET_DB_URL para o banco administrativo do destino."

ref_url=""
case "$RESTORE_TARGET_SUPABASE_URL" in
  https://*.supabase.co)
    ref_url="${RESTORE_TARGET_SUPABASE_URL#https://}"
    ref_url="${ref_url%.supabase.co}"
    ;;
  http://localhost:*|http://127.0.0.1:*|https://localhost:*|https://127.0.0.1:*) ref_url="local" ;;
  *) die "URL alvo não é um projeto Supabase identificável nem loopback local." ;;
esac
[ "${ref_url,,}" = "${RESTORE_TARGET_PROJECT_REF,,}" ] \
  || die "A URL e a referência do projeto alvo não correspondem."
[ "${RESTORE_TARGET_PROJECT_REF,,}" != "zwjrhqqwizjpzmeayrju" ] \
  || die "O projeto Geral 1 é staging ativo e está bloqueado como destino de restore."

source_ref="$(sed -n 's/^source_project_ref=//p' "$BUNDLE/release-metadata.txt" | head -1)"
source_url_ref="${NEXT_PUBLIC_SUPABASE_URL:-}"
source_url_ref="${source_url_ref#https://}"
source_url_ref="${source_url_ref%.supabase.co}"
[ -n "$source_ref" ] && [ "$source_ref" != "unknown" ] \
  || die "O bundle não identifica o projeto de origem; restore cloud recusado."
[ "${RESTORE_TARGET_PROJECT_REF,,}" != "${source_ref,,}" ] \
  || die "O projeto de origem também não pode ser o destino."
if [ -n "$source_url_ref" ] && [ "${source_url_ref,,}" = "${RESTORE_TARGET_PROJECT_REF,,}" ]; then
  die "O destino coincide com o projeto ativo da instalação."
fi

db_uri="${RESTORE_TARGET_DB_URL#*://}"
db_authority="${db_uri%%/*}"
db_userinfo="${db_authority%%@*}"
db_hostport="${db_authority#*@}"
db_host="${db_hostport%%:*}"
db_user="${db_userinfo%%:*}"
db_ref=""
if [[ "$db_host" =~ ^db\.([a-z0-9]+)\.supabase\.co$ ]]; then
  db_ref="${BASH_REMATCH[1]}"
elif [[ "$db_user" =~ ^postgres\.([a-z0-9]+)$ ]]; then
  db_ref="${BASH_REMATCH[1]}"
elif [[ "$RESTORE_TARGET_PROJECT_REF" = "local" && "$db_host" =~ ^(localhost|127\.0\.0\.1)$ ]]; then
  db_ref="local"
fi
[ "$db_ref" = "${RESTORE_TARGET_PROJECT_REF,,}" ] \
  || die "A conexão PostgreSQL não comprova o mesmo projeto informado na URL alvo."

source_archive_ref="$(sed -n '1s/.*"source_project_ref":"\([^"]*\)".*/\1/p' "$BUNDLE/artifacts/storage.jsonl")"
[ "$source_archive_ref" = "$source_ref" ] \
  || die "A origem indicada no arquivo de Storage diverge do manifesto."

printf '\nDestino isolado declarado: %s\n' "$RESTORE_TARGET_PROJECT_REF"
printf 'Bundle criado em: %s\n' "$(sed -n 's/^backup_created_utc=//p' "$BUNDLE/release-metadata.txt" | head -1)"
c_ylw "Confirme que este é um projeto Supabase novo, descartável e sem dados que precisem ser preservados."
read -r -p "Digite exatamente a referência alvo (${RESTORE_TARGET_PROJECT_REF}) para autorizar a escrita: " typed_ref
[ "${typed_ref,,}" = "${RESTORE_TARGET_PROJECT_REF,,}" ] || die "Confirmação divergente; nenhum dado foi escrito."

step "Conferindo que o destino está vazio"
preflight_sql="$(cat <<'SQL'
do $restore$
declare org_count bigint := 0; user_count bigint := 0; object_count bigint := 0;
begin
  if to_regclass('public.organizations') is not null then execute 'select count(*) from public.organizations' into org_count; end if;
  if to_regclass('auth.users') is not null then execute 'select count(*) from auth.users' into user_count; end if;
  if to_regclass('storage.objects') is not null then execute 'select count(*) from storage.objects' into object_count; end if;
  if org_count <> 0 or user_count <> 0 or object_count <> 0 then
    raise exception 'restore target is not empty (organization/auth/storage data exists)';
  end if;
end
$restore$;
SQL
)"
pg_container "$RESTORE_TARGET_DB_URL" -- psql -X -v ON_ERROR_STOP=1 -c "$preflight_sql" \
  || die "O destino não passou no preflight vazio; nenhuma restauração foi iniciada."

step "Aplicando a baseline capturada no bundle"
pg_container "$RESTORE_TARGET_DB_URL" -- psql -X -v ON_ERROR_STOP=1 -c \
  "create extension if not exists vector with schema public; create extension if not exists citext with schema public; create extension if not exists pg_trgm with schema public;" \
  || die "Não foi possível preparar as extensões no alvo isolado."
pg_container "$RESTORE_TARGET_DB_URL" --stdin -- psql -X -v ON_ERROR_STOP=1 \
  < "$BUNDLE/artifacts/baseline.sql" \
  || die "A baseline não aplicou integralmente. O alvo descartável pode estar parcialmente preparado; não o use."

step "Restaurando registros PostgreSQL e Auth"
pg_container "$RESTORE_TARGET_DB_URL" --mount "type=bind,source=$BUNDLE/artifacts/database.data.dump,target=/restore.dump,readonly" \
  -- pg_restore --exit-on-error --data-only --disable-triggers --no-owner --no-privileges /restore.dump \
  || die "O restore dos registros falhou. O destino descartável pode estar parcialmente preenchido; recrie-o antes de repetir."

step "Restaurando bytes e configurações de Storage"
{
  printf '%s\n' "$RESTORE_TARGET_SUPABASE_URL"
  printf '%s\n' "$RESTORE_TARGET_SERVICE_ROLE_KEY"
  printf '%s\n' "$RESTORE_TARGET_PROJECT_REF"
  printf '%s\n' 'I_CREATED_AN_EMPTY_DISPOSABLE_PROJECT'
  cat "$BUNDLE/artifacts/storage.jsonl"
} | dc exec -T app node scripts/storage-archive.mjs restore \
  || die "O restore de Storage falhou. O destino descartável pode estar parcialmente preenchido; recrie-o antes de repetir."

c_grn "✓ artefatos restaurados no destino descartável $RESTORE_TARGET_PROJECT_REF"
c_ylw "A restauração não atesta Auth externo, sessões, MFA, RLS A/B, login, health ou jornada visual. Execute o checklist isolado antes de considerar recuperação aprovada."
