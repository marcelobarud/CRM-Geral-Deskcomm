[CmdletBinding()]
param(
  [string]$PostgresHost = "127.0.0.1",
  [int]$PostgresPort = 5432,
  [string]$Database = "crm_geral_dev",
  [string]$DbUser = "crm_geral_app",
  [string]$PsqlPath = "D:\PostGre\bin\psql.exe",
  [switch]$SkipBaseline
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$localDir = Join-Path $repo ".local-dev"
New-Item -ItemType Directory -Force $localDir | Out-Null

if (-not (Test-Path -LiteralPath $PsqlPath)) { throw "psql.exe não encontrado em $PsqlPath" }

function Invoke-Psql([string]$user, [string]$database, [string]$sqlFile, [hashtable]$vars = @{}) {
  $arguments = @("-h", $PostgresHost, "-p", "$PostgresPort", "-U", $user, "-d", $database, "-v", "ON_ERROR_STOP=1", "-f", $sqlFile)
  foreach ($entry in $vars.GetEnumerator()) { $arguments += @("-v", "$($entry.Key)=$($entry.Value)") }
  & $PsqlPath @arguments
  if ($LASTEXITCODE -ne 0) { throw "psql falhou ao executar $sqlFile (exit $LASTEXITCODE)." }
}

$adminPassword = Read-Host "Senha temporária do usuário PostgreSQL administrador"
$env:PGPASSWORD = $adminPassword
$localPassword = Read-Host "Senha do usuário local CRM (não será gravada no código)"
$localEmail = if ($env:LOCAL_DEV_AUTH_EMAIL) { $env:LOCAL_DEV_AUTH_EMAIL } else { "admin@crmgeral.local" }

& $PsqlPath -h $PostgresHost -p $PostgresPort -U postgres -d postgres -v ON_ERROR_STOP=1 -c "select 1" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Não foi possível conectar ao PostgreSQL como administrador." }

Invoke-Psql "postgres" $Database (Join-Path $repo "scripts\local-dev\bootstrap-postgres.sql")
& $PsqlPath -h $PostgresHost -p $PostgresPort -U postgres -d $Database -v ON_ERROR_STOP=1 -c 'CREATE SCHEMA IF NOT EXISTS extensions; ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions; ALTER EXTENSION pgcrypto SET SCHEMA extensions;'
if ($LASTEXITCODE -ne 0) { throw "Não foi possível preparar as extensões locais." }

if (-not $SkipBaseline) {
  $baselineLog = Join-Path $localDir "baseline-apply.log"
  & $PsqlPath -h $PostgresHost -p $PostgresPort -U postgres -d $Database -v ON_ERROR_STOP=0 -f (Join-Path $repo "supabase\baseline.sql") 2>&1 | Tee-Object -FilePath $baselineLog
  if (Select-String -Path $baselineLog -Pattern "ERROR:" -Quiet) {
    Write-Warning "O baseline terminou com erros registrados em $baselineLog. Revise-os antes de tratar o banco como completo."
  }
}

# O seed inicial cruza auth + tenancy e por isso é uma operação de bootstrap DBA.
# A aplicação continua usando $DbUser e RLS normalmente em runtime.
Invoke-Psql "postgres" $Database (Join-Path $repo "scripts\local-dev\seed-development.sql") @{ local_auth_email = $localEmail; local_auth_password = $localPassword }
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
Write-Host "Banco local preparado: $Database; usuário de aplicação: $DbUser; e-mail local: $localEmail"
