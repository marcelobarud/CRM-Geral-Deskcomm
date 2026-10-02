[CmdletBinding()]
param(
  [string]$PostgresHost = '127.0.0.1',
  [int]$PostgresPort = 5432,
  [string]$Database = 'crm_geral_dev',
  [string]$AdminUser = 'postgres',
  [string]$PsqlPath = 'D:\PostGre\bin\psql.exe'
)
$ErrorActionPreference = 'Stop'
if ($Database -ne 'crm_geral_dev') { throw 'Este script é específico para crm_geral_dev.' }
if (-not (Test-Path -LiteralPath $PsqlPath)) { throw 'psql não encontrado.' }
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$files = @(
  '20261002180000_0237_crm_geral_exclusao_transacional.sql',
  '20261002181000_0238_crm_geral_auditoria_e_followup_rls.sql',
  '20261002182000_0239_crm_geral_lgpd_conteudo_associado.sql'
)
foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath (Join-Path $repo "supabase\migrations\$file"))) { throw "Migration ausente: $file" }
}
Write-Host "Alvo: $PostgresHost`:$PostgresPort/$Database. Aplica somente hardening incremental, sem apagar banco/linhas ou executar seed."
$credential = [PSCredential]::new($AdminUser, (Read-Host 'Senha DBA (não será exibida nem gravada)' -AsSecureString))
$previousPassword = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $credential.GetNetworkCredential().Password
  $arguments = @('-w','-h',$PostgresHost,'-p',"$PostgresPort",'-U',$AdminUser,'-d',$Database,'-v','ON_ERROR_STOP=1','-1')
  foreach ($file in $files) { $arguments += @('-f',(Join-Path $repo "supabase\migrations\$file")) }
  & $PsqlPath @arguments
  if ($LASTEXITCODE -ne 0) { throw 'Aplicação falhou; a transação inteira foi revertida.' }
  Write-Host 'Hardening aplicado na mesma transação. Auth, REST/RPC e seed preservados.'
} finally {
  $env:PGPASSWORD = $previousPassword
  $credential = $null
}
