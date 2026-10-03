[CmdletBinding()]
param([string]$PostgresHost='127.0.0.1',[int]$PostgresPort=5432,[string]$AdminUser='postgres')
$ErrorActionPreference='Stop'
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$migration = Join-Path $repo 'supabase/migrations/20261003010000_0240_crm_geral_capacidades.sql'
$grantsMigration = Join-Path $repo 'supabase/migrations/20261003011000_0241_crm_geral_capacidades_grants.sql'
$namespaceMigration = Join-Path $repo 'supabase/migrations/20261003012000_0242_crm_geral_capacidades_namespace.sql'
$psqlPath='D:\PostGre\bin\psql.exe'
if (-not (Test-Path -LiteralPath $migration) -or -not (Test-Path -LiteralPath $grantsMigration) -or -not (Test-Path -LiteralPath $namespaceMigration) -or -not (Test-Path -LiteralPath $psqlPath)) { throw 'Migration ou psql ausente.' }
Write-Host 'Alvo: crm_geral_dev. Aplica somente migrations 0240–0242 em transação, sem seed ou remoção de dados.'
$credential=[PSCredential]::new($AdminUser,(Read-Host 'Senha DBA (não será exibida nem gravada)' -AsSecureString))
$previousPassword=$env:PGPASSWORD
try {
  $env:PGPASSWORD=$credential.GetNetworkCredential().Password
  & $psqlPath -w -h $PostgresHost -p $PostgresPort -U $AdminUser -d crm_geral_dev -v ON_ERROR_STOP=1 -1 -f $migration -f $grantsMigration -f $namespaceMigration
  if ($LASTEXITCODE -ne 0) { throw 'Aplicação falhou; transação revertida.' }
  Write-Host 'Fundação aplicada. Dados e demais configurações preservados.'
} finally { $env:PGPASSWORD=$previousPassword; $credential=$null }
