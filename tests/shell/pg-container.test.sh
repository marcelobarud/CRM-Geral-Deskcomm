#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/docker" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$DOCKER_ARGS"
while [ "$#" -gt 0 ] && [ "$1" != "postgres:17-alpine" ]; do shift; done
[ "${1:-}" = "postgres:17-alpine" ] || exit 88
shift
[ "${1:-}" = "sh" ] || exit 89
shift
[ "${1:-}" = "-c" ] || exit 90
shift
script="$1"
shift
exec /bin/bash -c "$script" "$@"
STUB
cat > "$WORK/test-postgres-client" <<'STUB'
#!/usr/bin/env bash
printf 'PGHOST=%s\nPGPORT=%s\nPGDATABASE=%s\nPGUSER=%s\nPGPASSWORD=%s\nPGSSLMODE=%s\n' \
  "$PGHOST" "$PGPORT" "$PGDATABASE" "$PGUSER" "$PGPASSWORD" "$PGSSLMODE"
if [ "${1:-}" = "--read-stdin" ]; then cat; fi
STUB
chmod +x "$WORK/docker" "$WORK/test-postgres-client"
export DOCKER_ARGS="$WORK/docker-args.txt"
export PATH="$WORK:$PATH"
source "$ROOT/hostgator-setup-kit/_common.sh"

uri='postgresql://dba:p%40ss%3Aword@pooler.example:6543/crm?sslmode=verify-full&application_name=crm-general'
plain="$(pg_container "$uri" -- test-postgres-client)"
[[ "$plain" == *"PGHOST=pooler.example"* ]]
[[ "$plain" == *"PGPORT=6543"* ]]
[[ "$plain" == *"PGDATABASE=crm"* ]]
[[ "$plain" == *"PGUSER=dba"* ]]
[[ "$plain" == *"PGPASSWORD=p@ss:word"* ]]
[[ "$plain" == *"PGSSLMODE=verify-full"* ]]
! grep -Fq 'p%40ss' "$DOCKER_ARGS"

dump="$(printf 'synthetic dump bytes\n' | pg_container "$uri" --stdin -- test-postgres-client --read-stdin)"
[[ "$dump" == *"synthetic dump bytes"* ]]
printf 'pg_container parser and stdin forwarding passed\n'
